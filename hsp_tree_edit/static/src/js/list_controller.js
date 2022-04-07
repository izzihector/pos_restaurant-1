odoo.define('hsp_tree_edit.ListController', function (require) {
    "use strict";

    var core = require('web.core');
    var ListController = require('web.ListController');


    var _t = core._t;

    ListController.include({
        renderButtons: function ($node) {
            this._super.apply(this,arguments);
            if (this.$buttons=== undefined){
                return
            }
            this.hsp_editable_btn = $('<button type="button" style="color: #6c757d;" class="btn btn-secondary fa fa-pencil hsp_editable_btn" title="编辑" style="position: relative;"></button>')
            this.hsp_editable_btn.appendTo(this.$buttons)
            this.$buttons.on('click', '.hsp_editable_btn', this._onHspEditableBtn.bind(this));
        },
        _onHspEditableBtn: function(){
            if(typeof this.renderer.editable === 'undefined' || this.renderer.editable == false){
                this.renderer.editable=true
                this.hsp_editable_btn.attr('style', "color: #00a09d;");
            }else{
                this.renderer.editable=false
                this.hsp_editable_btn.attr('style', "color: #6c757d;");
            }
            
        }
    })
});
