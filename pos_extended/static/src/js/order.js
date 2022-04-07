"use strict";
/*
    This module create by: thanhchatvn@gmail.com
    License: OPL-1
    Please do not modification if i not accept
    Thanks for understand
 */
odoo.define('pos_retail.order', function (require) {

    var utils = require('web.utils');
    var round_pr = utils.round_precision;
    var models = require('point_of_sale.models');
    var core = require('web.core');
    var _t = core._t;

    var _super_Orderline = models.Orderline.prototype;
    models.Orderline = models.Orderline.extend({
        get_childrens: function (){
            var self =this;
            var child_ids = []
            for (var i = 0; i < self.children_ids.length; i++) {
                client = self.pos.db.get_partner_by_id(self.children_ids[i][1]);
                child_ids.push(client['name']);
            }
            console.log(">>>>>>>>>>>>>>>>child_ids", child_ids)
            return child_ids;
        },
    });
});