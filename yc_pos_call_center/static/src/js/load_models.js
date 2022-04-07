odoo.define('yc_pos_call_center.load_models', function (require) {
    var models = require('point_of_sale.models');
    var time = require('web.time');
    var Session = require('web.Session');
    var exports = {};
    var Backbone = window.Backbone;
    var bus = require('pos_retail.core_bus');

    var _super_PosModel = models.PosModel.prototype;

    models.load_fields("res.partner",['parent_id', 'child_ids']);

    var pos_models = require('point_of_sale.models');

    models.load_models([
        {
            model: 'res.district',
            fields: ['name'],
            loaded: function(self,city){
                self.city = city;
            },
        },
        {
            model: 'pos.branch',
            fields: ['name'],
            loaded: function(self,branch){
                self.branch = branch;
            },
        },
        {
            model: 'stock.location',
            fields: ['name', 'display_name'],
            domain: function(self){return [['usage', '=', 'internal']]; },
            loaded: function(self,location){
                self.location = location;
            },
        },
        {
            model: 'sale.order',
            fields: [
                'create_date',
                'name',
                'origin',
                'client_order_ref',
                'state',
                'date_order',
                'validity_date',
                'confirmation_date',
                'user_id',
                'partner_id',
                'partner_invoice_id',
                'partner_shipping_id',
                'invoice_status',
                'payment_term_id',
                'note',
                'amount_tax',
                'amount_total',
                'picking_ids',
                'delivery_address',
                'delivery_date',
                'delivery_phone',
                'book_order',
                'payment_partial_amount',
                'payment_partial_journal_id',
                'write_date',
                'ean13',
                'pos_branch'
            ],
            domain: function (self) {
                var domain = [['state', '!=', 'done'], ['pos_branch', '=', self.config.pos_branch_id[0]]];
                return domain;
            },
            condition: function (self) {
                return self.config.booking_orders;
            },
            context: {'pos': true},
            loaded: function (self, orders) {
                self.booking_ids = [];
                for (var i = 0; i < orders.length; i++) {
                    self.booking_ids.push(orders[i].id)
                }
                self.db.sale_order_by_branch = orders
                self.db.save_sale_orders(orders);
            },
            retail: true,
        },
    ]);

    var _super_order = models.Order.prototype;
    models.Order = models.Order.extend({
        get_partner_addresses: function (client){
            var self =this;
            var pos_db = self.pos.db.partner_by_id
            child_lst = []
            if (client){
                for(var i=0;i<client.child_ids.length;i++){
                    var client_rec = self.pos.db.partner_by_id[client.child_ids[i]];
                    child_lst.push(client_rec);
                }
            }
            return child_lst;
        },
        get_partner_addresses_from_id: function (client){
            var self =this;
            var pos_db = self.pos.db.partner_by_id
            child_lst = []
            if (client){
                var client_rec = self.pos.db.partner_by_id[client];
                child_lst.push(client_rec)
            }
            return client_rec;
        },
    });
});
