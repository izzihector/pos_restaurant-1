odoo.define('yc_pos_call_center.screen_sale_orders_1', function (require) {
"use strict";
    var models = require('point_of_sale.models');
    var screens = require('point_of_sale.screens');
    var core = require('web.core');
    var gui = require('point_of_sale.gui');
    var rpc = require('pos.rpc');
    var qweb = core.qweb;
    var PopupWidget = require('point_of_sale.popups');
    var POSBookingOrderButton = require('pos_retail.screen_sale_orders');

    var _super_order = models.Order.prototype;

    POSBookingOrderButton.button_booking_order.include({
        button_click: function () {
            var self = this;
            var order = this.pos.get_order();
            if (order.is_return) {
                return this.pos.gui.show_popup('dialog', {
                    title: 'Error',
                    body: 'Return order not allow create booking order',
                });
            }
            var pricelist = order['pricelist'];
            if (!pricelist) {
                pricelist = this.pos.default_pricelist;
            }
            var length = order.orderlines.length;
            if (!order.get_client()) {
                this.gui.show_popup('dialog', {
                    title: 'Warning',
                    body: "Required add client the first",
                });
                return this.pos.gui.show_screen('clientlist');

            }
            return this.gui.show_popup('popup_create_booking_order', {
                title: 'Create book order',
                pricelist: pricelist,
                order: order,
                client: order.get_client(),
            });
        }
    });
});