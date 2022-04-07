"use strict";
odoo.define('pos_extended.pop_selection_extend', function (require) {

    var core = require('web.core');
    var gui = require('point_of_sale.gui');
    var qweb = core.qweb;
    var PopupWidget = require('point_of_sale.popups');

    var popup_create_child = PopupWidget.extend({
        template: 'popup_create_child',
        show: function (options) {
            var self = this;
            options = options || {};
            this._super(options);
            this.renderElement();
            this.$('.confirm').click(function () {
                self.click_confirm_child();
            });
            this.$('.cancel').click(function () {
                self.click_cancel();
            });
        },
        click_confirm_child: function () {
            var self = this
            var fields = {};
            var customer_name = false
            var children_name = false
            var children_email = false
            var children_phone = false
            var children_dob = false
            this.$('.children_field').each(function (idx, el) {
                fields[el.name] = el.value || false;
            });
            if (!fields['customer']) {
                return this.wrong_input("input[name='customer']", "(*) Customer name is Blank");
            } else {
                customer_name = fields['customer']
            }
            if (!fields['children']) {
                return this.wrong_input("input[name='children']", "(*) Child name is Blank");
            } else {
                children_name = fields['children']
            }
            if (fields['email']) {
                children_email = fields['email']
            }
            if (fields['mobile']) {
                children_phone = fields['mobile']
            }
            if (fields['dob']) {
                children_dob = fields['dob']
            }

            var domain = [
                ['parents_id', '=', customer_name],
                ['name', '=', children_name],
                ['email', '=', children_email],
                ['mobile', '=', children_phone],
                ['dob', '=', children_dob],
            ];
            this._rpc({
                model:  'res.partner',
                method: 'search',
                args: [domain],
            }).then(function (result) {
                if (!result.length){
                    self._rpc({
                        model:  'res.partner',
                        method: 'create',
                        args: [{'parents_id': customer_name,
                                'name': children_name,
                                'email': children_email,
                                'mobile': children_phone,
                                'dob': children_dob,
                        }]
                    }).then(function (res){
                        var dom = [
                                    ['id', '=', res],
                                ];
                        self._rpc({
                            model:  'res.partner',
                            method: 'search_read',
                            args: [dom],
                        }).then(function(resu){
                            if (resu){
                                self.pos.db.add_partners(resu)
                            }
                        });
                    })
                }
            });
            self.pos.trigger('client:save_changes');

            this.gui.close_popup();
            if (this.options.confirm) {
                this.options.confirm.call(this, fields);
            }
        },
    });

    gui.define_popup({name: 'popup_create_child', widget: popup_create_child});

    var popup_selection_extend = PopupWidget.extend({
        events: _.extend({}, PopupWidget.prototype.events, {
            'click .create_child': 'create_child',
        }),
        template: 'popup_selection_extend',
        show: function (options) {
            var self = this;
            this.limit = 100;
            this.options = options;
            this.mutli_choice = options.multi_choice;
            this.fields = options.fields;
            this.sub_datas = options.sub_datas;
            this.sub_template = options.sub_template;
            this.record_by_id = {};
            this.record_search_string = "";
            if (options.sub_search_string) {
                this.record_search_string = options.sub_search_string;
            }
            if (options.sub_record_by_id) {
                this.record_by_id = options.sub_record_by_id;
            }
            if (!options.sub_record_by_id) {
                for (var i = 0; i < this.sub_datas.length; i++) {
                    var record = this.sub_datas[i];
                    this.record_by_id[record['id']] = record;
                    if (!options.sub_search_string) {
                        this.record_search_string += this._store_search_string(record, this.fields);
                    }
                }
            }
            this.search_handler = function (event) {
                if (event.type == "keypress" || event.keyCode === 46 || event.keyCode === 8) {
                    var searchbox = this;
                    setTimeout(function () {
                        self.perform_search(searchbox.value, event.which === 13);
                    }, 70);
                }
            };
            this._super(options);
            this.$el.find('input').focus();
            this.$el.find('tbody').html(qweb.render(this.sub_template, {
                sub_datas: this.sub_datas,
                widget: self
            }));
            this.clear_search_handler = function (event) {
                self.clear_search();
            };
            this.el.querySelector('.searchbox input').addEventListener('keypress', this.search_handler);
            this.el.querySelector('.searchbox input').addEventListener('keydown', this.search_handler);
            this.el.querySelector('.searchbox .search-clear').addEventListener('click', this.clear_search_handler);
            if (options.sub_button) {
                var button = document.createElement('div');
                button.innerHTML = options.sub_button;
                button.addEventListener('click', options.sub_button_action);
                this.el.querySelector('.form-footer').appendChild(button);
            }
            this._add_event_click_line();
        },
        _add_event_click_line: function () {
            var self = this;
            if (!this.mutli_choice) {
                this.$('.line-select').click(function () {
                    var line_id = parseInt($(this).data('id'));
                    if (self.options.confirm) {
                        self.options.confirm.call(self, parseInt(line_id));
                        self.pos.gui.close_popup();
                    }
                });
            } else {
                this.selected_ids = [];
                this.$('.line-select').click(function () {
                    var selected_id = parseInt($(this).data('id'));
                    if ($(this).closest('.line-select').hasClass("item-selected") == true) {
                        $(this).closest('.line-select').toggleClass("item-selected");
                        self.selected_ids = _.filter(self.selected_ids, function (id) {
                            return id != selected_id
                        })
                    } else {
                        $(this).closest('.line-select').toggleClass("item-selected");
                        self.selected_ids.push(selected_id)
                    }
                });
            }
        },
        click_confirm: function () {
            if (this.mutli_choice && this.options.confirm) {
                this.options.confirm.call(this, this.selected_ids);
                this.pos.gui.close_popup();
            }
        },
        _rerender_list: function (records) {
            this.$el.find('tbody').html(qweb.render(this.sub_template, {
                sub_datas: records,
                widget: this
            }));
            this._add_event_click_line();
        },
        _store_search_string: function (record, fields) {
            var str = "";
            for (var i = 0; i < fields.length; i++) {
                var field = fields[i];
                if (i == 0) {
                    str = record[field]
                } else {
                    str += '|' + record[field]
                }
            }
            str = '' + record['id'] + ':' + str.replace(':', '') + '\n';
            return str;
        },
        search_record: function (query) {
            try {
                query = query.replace(/[\[\]\(\)\+\*\?\.\-\!\&\^\$\|\~\_\{\}\:\,\\\/]/g, '.');
                query = query.replace(' ', '.+');
                var re = RegExp("([0-9]+):.*?" + query, "gi");
            } catch (e) {
                return [];
            }
            var results = [];
            for (var i = 0; i < this.limit; i++) {
                var r = re.exec(this.record_search_string);
                if (r && r[1]) {
                    var id = r[1];
                    if (this.record_by_id[id] !== undefined) {
                        results.push(this.record_by_id[id]);
                    }
                } else {
                    break;
                }
            }
            return results;
        },
        clear_search: function () {
            var records = this.sub_datas;
            this._rerender_list(records);
            var input = this.el.querySelector('input');
            input.value = '';
            input.focus();
        },
        perform_search: function (query, associate_result) {
            var records;
            if (query) {
                records = this.search_record(query);
                return this._rerender_list(records);

            } else {
                records = this.sub_datas;
                return this._rerender_list(records);
            }
        },
        create_child: function(){
            var self = this;
            self.pos.gui.show_popup('popup_create_child', {
                title: 'Create Child',
            })
        }
    });
    gui.define_popup({
        name: 'popup_selection_extend',
        widget: popup_selection_extend
    });
});
