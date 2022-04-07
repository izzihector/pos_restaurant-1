odoo.define('pos_extended.pos',function (require) {
    "use strict";

    require('bus.BusService');


    var bus = require('bus.Longpolling');
    var cross_tab = require('bus.CrossTab').prototype;
    var models = require('point_of_sale.models');
    var chrome = require('point_of_sale.chrome');
    var screens = require('point_of_sale.screens');
    var session = require('web.session');
    var gui = require('point_of_sale.gui');
    var core = require('web.core');
    var rpc = require('web.rpc');
    var DB = require('point_of_sale.DB');
    var PopupWidget = require('point_of_sale.popups');
    var framework = require('web.framework');
    var Widget = require('web.Widget');
    var _t = core._t;
    var QWeb = core.qweb;

    models.load_fields("res.users", ['kitchen_screen_user','pos_category_ids']);
    models.load_fields("res.partner",['is_parent','parents_id','dob']);
    models.load_fields("pos.order.line", ['state']);

    var  SetChildren= screens.ActionButtonWidget.extend({
        template: 'SetChildren',
        get_child_by_parent: function (p_id) {
            var self = this
            var partner = []
            for (var partner_id in this.partner_by_id) {
                var temp_partner_by_id = this.partner_by_id[partner_id];
                if (temp_partner_by_id.parents_id[0] == p_id){
                    partner.push(temp_partner_by_id);
                }
            }
            return partner;
        },
        button_click:  function(){
            var self = this;
            var selected_customer = self.pos.get_client();
            if (selected_customer == null){
                return alert('Please Select Customer !!!')
            }
            else{
                var quickly_search_client = self.pos.config.quickly_search_client;
                if (quickly_search_client) {
                    self.pos.gui.show_popup('popup_selection_extend', {
                        title: 'Select Child',
                        multi_choice : true,
                        fields: ['name', 'email', 'phone', 'mobile'],
                        sub_datas: self.pos.db.get_child_by_parent(selected_customer["id"]),
                        sub_search_string: self.pos.db.partner_search_string,
                        sub_record_by_id: self.pos.db.partner_by_id,
                        sub_template: 'child_list',
                        body: 'Please select one client',
                        sub_button: '<div class="btn btn-success pull-right confirm">Add Children</div><div class="btn btn-success pull-right create_child">Create Children</div>',
                        confirm: function(client_ids){
                            var order = self.pos.get_order();
                            var selcted_order = order.get_selected_orderline();
                            console.log(">>>>>>>>>>>selcted_order", selcted_order)
                            if (selcted_order == null){
                                return alert('Please Select Product !!!')
                            }
                            else{
                                console.log(">>>>>>>>>>client_ids", client_ids)
                                for(var i=0;i<client_ids.length;i++){
                                    selcted_order.children_ids.push([4,client_ids[i]]);
                                }
                                selcted_order.trigger('change', selcted_order);
                                self.pos.trigger('client:save_changes');
                            }
                        },
                    })
                }
            }
        },
    });
    screens.define_action_button({
        'name': 'SetChildren',
        'widget': SetChildren,
        'condition': function () {
            return true;
        }
    });

    var _super_orderline = models.Orderline.prototype;
    models.Orderline = models.Orderline.extend({
        initialize: function(attr,options){
            this.children_ids = [];
            _super_orderline.initialize.call(this, attr, options);
        },
        export_as_JSON: function() {
            var lines = _super_orderline.export_as_JSON.call(this);
            var new_attr = {
                children_ids : this.children_ids,
            }
            $.extend(lines, new_attr);
            return lines;
        },
        get_childrens: function (){
            var self =this;
            var child_lst = [];
            var pos_db = self.pos.db.partner_by_id
            for(var i=0;i<self.children_ids.length;i++){
                var client = self.pos.db.partner_by_id[self.children_ids[i][1]];
                child_lst.push(client['name']);
                
            }
            console.log(">>>>>>>>>>>>>>>>child_lst", child_lst)
            return child_lst;
        },
    });


});