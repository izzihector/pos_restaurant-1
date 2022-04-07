odoo.define('pos_extended.database', function (require) {
    var db = require('point_of_sale.DB');
    var _super_db = db.prototype;
    var rpc = require('pos.rpc');
    var models = require('point_of_sale.models');

    db.include({

        get_child_by_parent: function (p_id) {
            var partner = []
            for (var partner_id in this.partner_by_id) {
                var temp_partner_by_id = this.partner_by_id[partner_id];
                if (temp_partner_by_id.parents_id[0] == p_id){
                    partner.push(temp_partner_by_id);
                }
            }
            return partner;
        },
        
        get_partners_sorted: function (max_count) {
            var partners = [];
            var max = 0;
            for (var partner_id in this.partner_by_id) {
                var temp_partner_by_id = this.partner_by_id[partner_id];
                if(temp_partner_by_id.parents_id!=true){
                    partners.push(this.partner_by_id[partner_id]);
                    max += 1;
                }
                if (max_count > 0 && max >= max_count) {
                    break;
                }
            }
            return partners;
        },
        
    })

    

});