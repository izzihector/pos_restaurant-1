odoo.define('yc_pos_call_center.load_models1', function (require) {
    var models = require('point_of_sale.models');
    var indexed_db = require('pos_retail.indexedDB');
    var time = require('web.time');
    var Session = require('web.Session');
    var exports = {};
    var Backbone = window.Backbone;
    var rpc = require('pos.rpc');
    var bus = require('pos_retail.core_bus');

    var _super_PosModel = models.PosModel.prototype;

    models.load_fields("res.partner",['parent_id', 'child_ids']);

    var pos_models = require('point_of_sale.models');

    var _pos_super = pos_models.PosModel.prototype;
    pos_models.PosModel = pos_models.PosModel.extend({
        sync_with_backend: function (model, datas, dont_check_write_time) {
            if (datas.length == 0) {
                console.warn('Data sync is old times. Reject:' + model);
                return false;
            }
            this.db.set_last_write_date_by_model(model, datas);
            if (model == 'pos.order') {
                this.db.save_pos_orders(datas);
            }
            if (model == 'pos.order.line') {
                this.db.save_pos_order_line(datas);
            }
            if (model == 'account.invoice') {
                this.db.save_invoices(datas);
            }
            if (model == 'account.invoice.line') {
                this.db.save_invoice_lines(datas);
            }
            if (model == 'sale.order') {
                this.db.save_sale_orders(datas);
                var order = datas[0];
                if (!order.deleted && order.state != 'done' && this.config.booking_orders_alert){
                    if (order.pos_branch[0] == this.config.pos_branch_id[0]){
                        this.trigger('new:booking_order', order['id']);
                    }
                }
            }
            if (model == 'sale.order.line') {
                this.db.save_sale_order_lines(datas);
            }
            if (model == 'res.partner') {
                var partner_datas = _.filter(datas, function (partner) {
                    return !partner.deleted || partner.deleted != true
                });
                if (partner_datas.length) {
                    this.db.add_partners(partner_datas);
                    if (this.gui.screen_instances && this.gui.screen_instances['clientlist']) {
                        this.gui.screen_instances["clientlist"].do_update_partners_cache(partner_datas);
                    }
                    this.update_customer_in_cart(partner_datas);
                }
            }
            if (model == 'product.product') {
                var product_datas = _.filter(datas, function (product) {
                    return !product.deleted || product.deleted != true
                });
                if (product_datas.length) {
                    if (this.gui.screen_instances && this.gui.screen_instances['products']) {
                        this.gui.screen_instances["products"].do_update_products_cache(product_datas);
                    }
                    this.update_products_in_cart(product_datas);
                }
            }
            if (model == 'product.product' || model == 'res.partner') {
                for (var i = 0; i < datas.length; i++) {
                    var data = datas[i];
                    if (!data['deleted'] || data['deleted'] == false) {
                        indexed_db.write(model, [data]);
                    } else {
                        indexed_db.unlink(model, data);
                        if (model == 'res.partner') {
                            this.remove_partner_deleted_outof_orders(data['id'])
                        }
                        if (model == 'product.product' && this.gui.screen_instances["products"]) {
                            this.remove_product_deleted_outof_orders(data['id']);
                            this.gui.screen_instances["products"].remove_product_out_of_screen(data);
                        }
                    }
                }
            }
            this.set('sync_backend', {state: 'connected', pending: 0});
        },
        push_order: function (order, opts) {
            opts = opts || {};
            var self = this;

            if(order){
                if (order.booking_order){
                    order.active = true;
                    var add_order_rec = this.db.add_order(order.export_as_JSON());
                    }
                else{
                    this.db.add_order(order.export_as_JSON());
                }
            }

            var pushed = new $.Deferred();

            this.flush_mutex.exec(function(){
                var flushed = self._flush_orders(self.db.get_orders(), opts);

                flushed.always(function(ids){
                    pushed.resolve();
                });

                return flushed;
            });

            if (!order) {
                return pushed;
            }
            var client = order && order.get_client();
            if (client) {
                for (var i = 0; i < order.paymentlines.models.length; i++) {
                    var line = order.paymentlines.models[i];
                    var amount = line.get_amount();
                    var journal = line.cashregister.journal;
                    if (journal.pos_method_type == 'wallet') {
                        client.wallet = -amount;
                    }
                    if (journal.pos_method_type == 'credit') {
                        client.balance -= line.get_amount();
                    }
                }
            }
            return pushed;
        }
    });

});

