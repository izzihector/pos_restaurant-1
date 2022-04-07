odoo.define('yc_pos_call_center.screen_sale_orders', function (require) {
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

    var db = require('point_of_sale.DB');

    var _super_order = models.Order.prototype;
    models.Order = models.Order.extend({
        export_as_JSON: function() {
            var submitted_order = _super_order.export_as_JSON.call(this);
            var new_val = {
                active: false,
            }
            $.extend(submitted_order, new_val);
            return submitted_order;
        },
    });

    db.include({
        get_sale_orders: function (max_count) {
            var orders = [];
            var max = 0;
            var self = this;
            for (var sale_id in this.sale_order_by_branch) {
                orders.push(this.sale_order_by_branch[sale_id]);
                max += 1;
                if (max_count > 0 && max >= max_count) {
                    break;
                }
            }
            return orders;
        },
    });


    var sale_orders = screens.ScreenWidget.extend({
        template: 'sale_orders',

        init: function (parent, options) {
            var self = this;
            this.sale_selected = null;
            this.reverse = true;
            this._super(parent, options);
            this.pos.bind('refresh:sale_orders_screen', function () {
                self.render_sale_orders(self.pos.db.get_sale_orders(1000));
                console.log(">>>>>>>>>>>>>orders", self.pos.db.get_sale_orders(1000))
                console.log(">>>>>>>>>>>>>orders", self.pos.db.sale_order_by_id)
                console.log(">>>>>>>>>>>>>orders", self.sale_selected)
                if (self.sale_selected) {
                    var order = self.pos.db.sale_order_by_id[self.sale_selected['id']];
                    if (order) {
                        self.display_sale_order(order)
                    } else {
                        self.hide_sale_selected();
                    }
                }
                else{
                    for (var i = 0, len = Math.min(self.pos.db.sale_order_by_id.length, 1000); i < len; i++) {
                        var order = self.pos.db.sale_order_by_id[i];
                        if (order) {
                            self.display_sale_order(order)
                        } else {
                            self.hide_sale_selected();
                        }
                    }
                }
            }, this);
            this.pos.bind('new:booking_order', function (order_id) {
                var sale = self.pos.db.sale_order_by_id[order_id];
                self.order_new = sale;

//                if (sale.pos_branch[0] == self.pos.config.pos_branch_id[0]){
                return self.pos.gui.show_popup('confirm', {
                    title: 'New Order ' + self.order_new['name'],
                    body: 'Are you want show it now ?',
                    confirm: function () {
                        self.pos.gui.show_screen('sale_orders');
                        setTimeout(function () {
                            self.display_sale_order(self.order_new);
                        }, 500)
                    }
                })
//                }
            });
        },
        renderElement: function () {
            // TODO: this method only one time called
            //      - show method: will call when show screen
            //      - this is reason if wanted init any event, do it in this function
            var self = this;
            this.clear_search_handler = function (event) {
                self.clear_search();
            };
            this.search_handler = function (event) {
                if (event.type == "keypress" || event.keyCode === 46 || event.keyCode === 8) {
                    var searchbox = this;
                    setTimeout(function () {
                        self.perform_search(searchbox.value, event.which === 13);
                    }, 70);
                }
            };
            this._super();
            this.apply_sort_sale_orders();
            this.render_sale_orders(this.pos.db.get_sale_orders(1000));
            this.$('.client-list-contents').delegate('.sale_row', 'click', function (event) {
                self.order_select(event, $(this), parseInt($(this).data('id')));
            });self.booking_ids
            this.el.querySelector('.searchbox input').addEventListener('keypress', this.search_handler);
            this.el.querySelector('.searchbox input').addEventListener('keydown', this.search_handler);
            this.el.querySelector('.searchbox .search-clear').addEventListener('click', this.clear_search_handler);
            this.$('.booked_order_button').click(function () {
                var sale_orders = _.filter(self.pos.db.get_sale_orders(), function (order) {
                    return order['book_order'] == true && (order['state'] == 'draft' || order['state'] == 'sent');
                });
                self.hide_sale_selected();
                self.render_sale_orders(sale_orders);
            });
            this.$('.button_sync').click(function () {
                self.hide_sale_selected();
                self.manual_refresh_screen()
            });
            this.$('.sale_lock_button').click(function () {
                var sale_orders = _.filter(self.pos.db.get_sale_orders(), function (order) {
                    return order['state'] == 'sale' || order['state'] == 'done';
                });
                self.hide_sale_selected();
                self.render_sale_orders(sale_orders);
            });
            this.$('.back').click(function () {
                self.gui.show_screen('products');
            });
        },
        apply_sort_sale_orders: function () {
            var self = this;
            this.$('.sort_by_create_date').click(function () {
                var orders = self._get_sale_orders_list().sort(self.pos.sort_by('create_date', self.reverse, function (a) {
                    if (!a) {
                        a = 'N/A';
                    }
                    return a.toUpperCase()
                }));
                self.render_sale_orders(orders);
                self.reverse = !self.reverse;
            });
            this.$('.sort_by_sale_order_id').click(function () {
                var orders = self._get_sale_orders_list().sort(self.pos.sort_by('id', self.reverse, parseInt));
                self.render_sale_orders(orders);
                self.reverse = !self.reverse;
            });
            this.$('.sort_by_sale_order_name').click(function () {
                var orders = self._get_sale_orders_list().sort(self.pos.sort_by('name', self.reverse, function (a) {
                    if (!a) {
                        a = 'N/A';
                    }
                    return a.toUpperCase()
                }));
                self.render_sale_orders(orders);
                self.reverse = !self.reverse;
            });
            this.$('.sort_by_sale_order_origin').click(function () {
                var orders = self._get_sale_orders_list().sort(self.pos.sort_by('origin', self.reverse, function (a) {
                    if (!a) {
                        a = 'N/A';
                    }
                    return a.toUpperCase()
                }));
                self.render_sale_orders(orders);
                self.reverse = !self.reverse;

            });
            this.$('.sort_by_sale_order_sale_person').click(function () {
                var orders = self._get_sale_orders_list().sort(self.pos.sort_by('sale_person', self.reverse, function (a) {
                    if (!a) {
                        a = 'N/A';
                    }
                    return a.toUpperCase()
                }));
                self.render_sale_orders(orders);
                self.reverse = !self.reverse;

            });
            this.$('.sort_by_sale_order_partner_name').click(function () {
                var orders = self._get_sale_orders_list().sort(self.pos.sort_by('partner_name', self.reverse, function (a) {
                    if (!a) {
                        a = 'N/A';
                    }
                    return a.toUpperCase()
                }));
                self.render_sale_orders(orders);
                self.reverse = !self.reverse;
            });
            this.$('.sort_by_sale_order_date_order').click(function () {
                var orders = self._get_sale_orders_list().sort(self.pos.sort_by('date_order', self.reverse, function (a) {
                    if (!a) {
                        a = 'N/A';
                    }
                    return a.toUpperCase()
                }));
                self.render_sale_orders(orders);
                self.reverse = !self.reverse;
            });
            this.$('.sort_by_sale_order_payment_partial_amount').click(function () {
                var orders = self._get_sale_orders_list().sort(self.pos.sort_by('payment_partial_amount', self.reverse, function (a) {
                    if (!a) {
                        a = 'N/A';
                    }
                    return a.toUpperCase();
                }));
                self.render_sale_orders(orders);
                self.reverse = !self.reverse;
            });
            this.$('.sort_by_sale_order_amount_tax').click(function () {
                var orders = self._get_sale_orders_list().sort(self.pos.sort_by('amount_tax', self.reverse, parseInt));
                self.render_sale_orders(orders);
                self.reverse = !self.reverse;
            });
            this.$('.sort_by_sale_order_amount_total').click(function () {
                var orders = self._get_sale_orders_list().sort(self.pos.sort_by('amount_total', self.reverse, parseInt));
                self.render_sale_orders(orders);
                self.reverse = !self.reverse;
            });
            this.$('.sort_by_sale_order_state').click(function () {
                var orders = self._get_sale_orders_list().sort(self.pos.sort_by('state', self.reverse, function (a) {
                    if (!a) {
                        a = 'N/A';
                    }
                    return a.toUpperCase();
                }));
                self.render_sale_orders(orders);
                self.reverse = !self.reverse;
            });
        },
        refresh_screen: function () {
            var self = this;
            this.pos.get_modifiers_backend_all_models().done(function () {
                self.hide_sale_selected();
                self.pos.trigger('refresh:sale_orders_screen');
            });
        },
        manual_refresh_screen: function () {
            var self = this;
            this.pos.get_modifiers_backend_all_models().done(function () {
                self.hide_sale_selected();
                self.pos.trigger('refresh:sale_orders_screen');
                self.pos.gui.show_popup('dialog', {
                    title: 'Succeed',
                    body: 'Sync between backend and your session succeed',
                    color: 'success'
                })
            });
        },
        show: function () {
            var self = this;
            var sale_selected = this.sale_selected;
            this._super();
            this.refresh_screen();
            this.$el.find('input').focus();
            if (sale_selected) {
                var sale = self.pos.db.sale_order_by_id[sale_selected['id']];
                self.display_sale_order(sale);
            }
        },
        clear_search: function () {
            var contents = this.$('.sale_order_detail');
            contents.empty();
            this.render_sale_orders(this.pos.db.get_sale_orders(1000));
            this.$('.searchbox input')[0].value = '';
            this.$('.searchbox input').focus();
        },
        perform_search: function (query, associate_result) {
            var orders;
            if (query) {
                orders = this.pos.db.search_sale_orders(query);
                if (associate_result && orders.length === 1) {
                    return this.display_sale_order(orders[0]);
                }
                return this.render_sale_orders(orders);
            } else {
                sale_orders = this.pos.db.get_sale_orders(1000);
                return this.render_sale_orders(sale_orders);
            }
        },
        _get_sale_orders_list: function () {
            if (!this.sale_list) {
                return this.pos.db.get_sale_orders(1000)
            } else {
                return this.sale_list;
            }
        },
        partner_icon_url: function (id) {
            return '/web/image?model=res.partner&id=' + id + '&field=image_small';
        },
        order_select: function (event, $order, id) {
            var order = this.pos.db.sale_order_by_id[id];
            this.$('.client-line').removeClass('highlight');
            $order.addClass('highlight');
            this.display_sale_order(order);
        },
        render_sale_orders: function (sales) {
            var contents = this.$el[0].querySelector('.sale_orders_table');
            console.log(">>>>>>>>>>>>>...contentscontents", contents)
            console.log(">>>>>>>>>>>>>...contentscontents", this.$el[0])
            console.log(">>>>>>>>>>>>>...contentscontents", sales)
            contents.innerHTML = "";
            for (var i = 0, len = Math.min(sales.length, 1000); i < len; i++) {
                var sale = sales[i];
                var sale_row_html = qweb.render('sale_row', {widget: this, sale: sale});
                var sale_row = document.createElement('tbody');
                sale_row.innerHTML = sale_row_html;
                sale_row = sale_row.childNodes[1];
                if (sale === this.sale_selected) {
                    sale_row.classList.add('highlight');
                } else {
                    sale_row.classList.remove('highlight');
                }
                contents.appendChild(sale_row);
            }
            console.log(">>>>>>>>>>>>>>>>..sales", sales)
            this.sale_list = sales;
        },
        display_sale_order: function (sale) {
            this.sale_selected = sale;
            var self = this;
            var contents = this.$('.sale_order_detail');
            contents.empty();
            if (!sale) {
                return;
            }
            var $row_selected = this.$("[data-id='" + sale['id'] + "']");
            $row_selected.addClass('highlight');
            sale['link'] = window.location.origin + "/web#id=" + sale.id + "&view_type=form&model=sale.order";
            contents.append($(qweb.render('sale_order_detail', {widget: this, sale: sale})));
            var sale_lines = this.pos.db.lines_sale_by_id[sale['id']];
            if (sale_lines) {
                var line_contents = this.$('.lines_detail');
                line_contents.empty();
                line_contents.append($(qweb.render('sale_order_lines', {widget: this, lines: sale_lines})));
            }
            this.$('.print_quotation').click(function () {
                if (!self.sale_selected) {
                    return self.pos.gui.show_popup('dialog', {
                        title: 'Warning',
                        body: 'Please select order the first'
                    })
                }
                self.chrome.do_action('sale.action_report_saleorder', {
                    additional_context: {
                        active_ids: [self.sale_selected['id']]
                    }
                })
            });
            this.$('.action_report_pro_forma_invoice').click(function () {
                if (!self.sale_selected) {
                    return self.pos.gui.show_popup('dialog', {
                        title: 'Warning',
                        body: 'Please select order the first'
                    })
                }
                self.chrome.do_action('sale.action_report_saleorder', {
                    additional_context: {
                        active_ids: [self.sale_selected['id']]
                    }
                });
                self.refresh_screen();
            });
            this.$('.action_confirm').click(function () {
                self.pos.gui.close_popup();
                if (!self.sale_selected) {
                    return self.pos.gui.show_popup('dialog', {
                        title: 'Warning',
                        body: 'Please select order the first'
                    })
                }
                return rpc.query({
                    model: 'sale.order',
                    method: 'action_confirm',
                    args:
                        [[self.sale_selected['id']]],
                    context: {
                        pos: true
                    }
                }).then(function () {
                    self.refresh_screen();
                    self.pos.trigger('refresh:sale_orders_screen');
                    orders = self.pos.db.get_sale_orders(1000);
//                    self.db.save_sale_orders(orders);
//                    self.render_sale_orders(self.pos.db.get_sale_orders(1000));
//                    self.pos.trigger('kitchen_order:send_to_kitchen_order');

                    return self.pos.gui.show_popup('dialog', {
                        title: 'Done',
                        body: 'Order just confirmed',
                        color: 'success'
                    })
                }).fail(function (error) {
                    return self.pos.query_backend_fail(error);
                })
            });
            this.$('.action_done').click(function () {
                if (!self.sale_selected) {
                    return self.pos.gui.show_popup('dialog', {
                        title: 'Warning',
                        body: 'Please select order the first'
                    })
                }
                return rpc.query({
                    model: 'sale.order',
                    method: 'action_done',
                    args:
                        [[self.sale_selected['id']]],
                    context: {
                        pos: true
                    }
                }).then(function () {
                    self.link = window.location.origin + "/web#id=" + self.sale_selected.id + "&view_type=form&model=sale.order";
                    self.refresh_screen();
                    return self.pos.gui.show_popup('dialog', {
                        title: 'Done',
                        body: 'Order process to done(locked)',
                        color: 'success'
                    })
                }).fail(function (error) {
                    return self.pos.query_backend_fail(error);
                })
            });
            this.$('.action_return').click(function () {
                if (!self.sale_selected) {
                    return self.pos.gui.show_popup('dialog', {
                        title: 'Warning',
                        body: 'Please select order the first'
                    })
                }
                if (self.sale_selected) {
                    self.pos.gui.show_popup('popup_stock_return_picking', {
                        sale: self.sale_selected,
                        title: 'Return sale order',
                        confirm: function () {
                            self.render_sale_orders(self.pos.db.get_sale_orders(1000));
                        }
                    })
                }
            });
            this.$('.action_validate_picking').click(function () {
                if (!self.sale_selected) {
                    return self.pos.gui.show_popup('dialog', {
                        title: 'Warning',
                        body: 'Please select order the first'
                    })
                }
                if (self.sale_selected) {
                    return rpc.query({
                        model: 'sale.order',
                        method: 'action_validate_picking',
                        args:
                            [[self.sale_selected['id']]],
                        context: {
                            pos: true
                        }
                    }).then(function (picking_name) {
                        self.refresh_screen();
                        if (picking_name) {
                            return self.pos.gui.show_popup('dialog', {
                                title: 'Done',
                                body: 'Order process to delivery done',
                                color: 'success'
                            })
                        } else {
                            self.link = window.location.origin + "/web#id=" + self.sale_selected.id + "&view_type=form&model=sale.order";
                            return self.pos.gui.show_popup('confirm', {
                                title: 'Warning',
                                body: 'Order have 2 picking, please do manual',
                                confirm: function () {
                                    window.open(self.link, '_blank');
                                },
                                cancel: function () {
                                    self.pos.gui.close_popup();
                                }
                            })
                        }
                        return self.pos.gui.close_popup();
                    }).fail(function (error) {
                        return self.pos.query_backend_fail(error);
                    })
                }
            });
            this.$('.action_covert_to_pos_order').click(function () {
                if (!self.sale_selected) {
                    return self.pos.gui.show_popup('dialog', {
                        title: 'Warning',
                        body: 'Please select order the first'
                    })
                }
                if (self.sale_selected) {
                    var sale_selected = self.sale_selected;
                    var lines = self.pos.db.lines_sale_by_id[sale_selected['id']];
                    if (!lines) {
                        return self.pos.gui.show_popup('dialog', {
                            title: 'Warning',
                            body: 'Sale order is blank lines, could not cover to pos order',
                        })
                    }
                    var order = new models.Order({}, {pos: self.pos, temporary: false});
                    order['name'] = self.sale_selected['name'];
                    order['sale_id'] = sale_selected['id'];
                    order['delivery_address'] = sale_selected['delivery_address'];
                    order['delivery_date'] = sale_selected['delivery_date'];
                    order['delivery_phone'] = sale_selected['delivery_phone'];
                    order['booking_id'] = self.sale_selected['id'];
                    var partner_id = sale_selected['partner_id'];
                    var partner = self.pos.db.get_partner_by_id(partner_id[0]);
                    if (partner) {
                        order.set_client(partner);
                    } else {
                        return self.pos.gui.show_popup('dialog', {
                            title: 'Warning',
                            body: 'Partner ' + partner_id[1] + ' not available on pos, please update this partner active on POS',
                        })
                    }
                    var added_line = false;
                    for (var i = 0; i < lines.length; i++) {
                        var line = lines[i];
                        var product = self.pos.db.get_product_by_id(line.product_id[0]);
                        if (!product) {
                            continue
                        } else {
                            added_line = true;
                            var new_line = new models.Orderline({}, {pos: self.pos, order: order, product: product});
                            new_line.set_quantity(line.product_uom_qty, 'keep price');
                            order.orderlines.add(new_line);
                            new_line.set_discount(line.discount || 0)
                            if (line.variant_ids) {
                                var variants = _.map(line.variant_ids, function (variant_id) {
                                    if (self.pos.variant_by_id[variant_id]) {
                                        return self.pos.variant_by_id[variant_id]
                                    }
                                });
                                new_line.set_variants(variants);
                            }
                            if (line.pos_note) {
                                new_line.set_line_note(line.pos_note);
                            }
                            if (line.product_uom) {
                                var uom_id = line.product_uom[0];
                                var uom = self.pos.uom_by_id[uom_id];
                                if (uom) {
                                    new_line.set_unit(line.product_uom[0]);
                                } else {
                                    self.pos.gui.show_popup('dialog', {
                                        title: 'Warning',
                                        body: 'Your pos have not unit ' + line.product_uom[1]
                                    })
                                }
                            }
                            new_line.set_unit_price(line.price_unit);
                        }
                    }
                    if (self.sale_selected['payment_partial_amount'] && self.sale_selected['payment_partial_journal_id']) {
                        var payment_partial_journal_id = self.sale_selected['payment_partial_journal_id'][0];
                        var payment_partial_register = _.find(self.pos.cashregisters, function (cashregister) {
                            return cashregister.journal['id'] == payment_partial_journal_id;
                        });
                        if (payment_partial_register) {
                            var partial_paymentline = new models.Paymentline({}, {
                                order: order,
                                cashregister: payment_partial_register,
                                pos: self.pos
                            });
                            partial_paymentline.set_amount(self.sale_selected['payment_partial_amount']);
                            order.paymentlines.add(partial_paymentline);
                            order['amount_debit'] = order.get_total_with_tax() - self.sale_selected['payment_partial_amount']
                        } else {
                            return self.pos.gui.show_popup('dialog', {
                                title: 'Warning',
                                body: 'Payment method ' + self.sale_selected['payment_partial_journal_id'][1] + ' removed out pos config. We could not add payment before bac to this order',
                            })
                        }
                    }
                    var orders = self.pos.get('orders');
                    orders.add(order);
                    self.pos.set('selectedOrder', order);
                    self.refresh_screen();
                    if (!added_line) {
                        return self.pos.gui.show_popup('confirm', {
                            title: 'Warning',
                            body: 'Lines of Booked Order have not any products available in pos, made sure all products of Booked Order have check to checkbox [Available in pos]'
                        })
                    }
                }
            });
            this.$('.print_receipt').click(function () {
                if (!self.sale_selected) {
                    return self.pos.gui.show_popup('dialog', {
                        title: 'Warning',
                        body: 'Please select order the first'
                    })
                }
                if (self.sale_selected) {
                    var sale_selected = self.sale_selected;
                    var lines = self.pos.db.lines_sale_by_id[sale_selected['id']];
                    if (!lines) {
                        return self.pos.gui.show_popup('dialog', {
                            title: 'Warning',
                            body: 'Sale order is blank lines, could not cover to pos order',
                        })
                    }
                    var order = new models.Order({}, {pos: self.pos, temporary: true});
                    order['name'] = self.sale_selected['name'];
                    order['sale_id'] = sale_selected['id'];
                    order['delivery_address'] = sale_selected['delivery_address'];
                    order['delivery_date'] = sale_selected['delivery_date'];
                    order['delivery_phone'] = sale_selected['delivery_phone'];
                    var partner_id = sale_selected['partner_id'];
                    // TODO: because sale order required have partner, we can get partner_id[0] and nothing bug
                    var partner = self.pos.db.get_partner_by_id(partner_id[0]);
                    if (partner) {
                        order.set_client(partner);
                    } else {
                        return self.pos.gui.show_popup('dialog', {
                            title: 'Warning',
                            body: 'Partner ' + partner_id[1] + ' not available on pos, please update this partner active on POS',
                        })
                    }
                    for (var i = 0; i < lines.length; i++) {
                        var line = lines[i];
                        var product = self.pos.db.get_product_by_id(line.product_id[0])
                        if (!product) {
                            continue
                        } else {
                            var new_line = new models.Orderline({}, {pos: self.pos, order: order, product: product});
                            new_line.set_quantity(line.product_uom_qty, 'keep price');
                            order.orderlines.add(new_line);
                            new_line.set_discount(line.discount || 0)
                            if (line.variant_ids) {
                                var variants = _.map(line.variant_ids, function (variant_id) {
                                    if (self.pos.variant_by_id[variant_id]) {
                                        return self.pos.variant_by_id[variant_id]
                                    }
                                });
                                new_line.set_variants(variants);
                            }
                            if (line.pos_note) {
                                new_line.set_line_note(line.pos_note);
                            }
                            if (line.product_uom) {
                                var uom_id = line.product_uom[0];
                                var uom = self.pos.uom_by_id[uom_id];
                                if (uom) {
                                    new_line.set_unit(line.product_uom[0]);
                                } else {
                                    self.pos.gui.show_popup('dialog', {
                                        title: 'Warning',
                                        body: 'Your pos have not unit ' + line.product_uom[1]
                                    })
                                }
                            }
                            new_line.set_unit_price(line.price_unit);
                        }
                    }
                    var orders = self.pos.get('orders');
                    orders.add(order);
                    self.pos.set('selectedOrder', order);
                    return self.pos.gui.show_screen('receipt');
                }
            })
        },
        hide_sale_selected: function () {
            var contents = this.$('.sale_order_detail');
            contents.empty();
            this.sale_selected = null;

        }
    });
    gui.define_screen({name: 'sale_orders', widget: sale_orders});


    var popup_create_booking_order = PopupWidget.extend({ // create booking order
        template: 'popup_create_booking_order',
        init: function (parent, options) {
            this._super(parent, options);
        },
        show: function (options) {
            var self = this;
            this._super(options);
            this.$('.datetimepicker').datetimepicker({
                format: 'YYYY-MM-DD H:mm:00',
                icons: {
                    time: "fa fa-clock-o",
                    date: "fa fa-calendar",
                    up: "fa fa-chevron-up",
                    down: "fa fa-chevron-down",
                    previous: 'fa fa-chevron-left',
                    next: 'fa fa-chevron-right',
                    today: 'fa fa-screenshot',
                    clear: 'fa fa-trash',
                    close: 'fa fa-remove'
                }
            });
//          set address according to the booking fields
            if (self.pos.get_order().draft_booking_order_details){
                var fields = self.pos.get_order().draft_booking_order_details
                this.$(".class_delivery_phone")[0].value = fields['delivery_phone']
//                this.$(".class_delivery_date")[0].value = fields['delivery_date']
                this.$(".class_delivery_note")[0].value = fields['note']
                this.$(".class_delivery_payment_method")[0].value = parseInt(fields['payment_method_id'])
                this.$(".class_delivery_amount")[0].value = fields['payment_partial_amount']
                this.$(".class_delivery_journal_id")[0].value = parseInt(fields['payment_partial_journal_id'])
                this.$(".class_delivery_pricelist")[0].value = parseInt(fields['pricelist_id'])
                this.$(".class_delivery_address")[0].value = parseInt(fields['delivery_address'])
                this.$(".class_district_branch")[0].value = parseInt(fields['branch'])
                this.$(".class_branch_location")[0].value = parseInt(fields['location'])
            }

            this.$(".pos_signature").jSignature();
            this.signed = false;
            this.$(".pos_signature").bind('change', function (e) {
                self.signed = true;
            });
            this.$(".cancel").click(function (e) {
                self.pos.gui.close_popup();
            });
        },
        renderElement: function () {
            var self = this;
            this._super();
            this.$('.cancel').click(function () {
                self.gui.close_popup();
            });
            this.$('.fa-plus').click(function () {
                self.gui.show_popup('partner_address_popup',{
                    'title': _t('Delivery Address'),
                    'body': _t('New Address'),
                    confirm: function(){
                        console.log(">>>>>>>>>confirm")
                    },
                });
            });
            this.$('.class_set_address').click(function () {
                var fields = {};
                self.$('.booking_field').each(function (idx, el) {
                    fields[el.name] = el.value || false;
                });
                var order = self.pos.get_order();
                var location = fields['location'];
                var dom = [
                    ['id', '=', location],
                ];
                self._rpc({
                    model:  'stock.location',
                    method: 'search_read',
                    args: [dom],
                }).then(function(result){
                    if (result){
                        order.set_location(result);
                        self.pos.gui.close_popup();
                        order['draft_booking_order_details'] = fields

                        var location_ids = [];
                        location_ids.push(location)

                        return self.pos._get_stock_on_hand_by_location_ids([], [parseInt(location)]).done(function (datas) {
                            self.pos.db.stock_datas = datas;
                            var products = [];
                            for (var product_id in datas) {
                                var product = self.pos.db.product_by_id[product_id];
                                if (product) {
                                    products.push(product)
                                }
                            }
                            if (products.length) {
                                self.pos.gui.screen_instances["products"].do_update_products_cache(products);
                                self.pos.gui.screen_instances["products_operation"].refresh_screen();
                                self.pos.gui.screen_instances['pos_orders_screen'].refresh_screen();
                            }
                            return self.gui.show_popup('dialog', {
                                title: 'Succeed',
                                body: 'Products Screen with display stock available with your stock locations selected',
                                color: 'success'
                            });
                        });
                    }
                });
            });
            this.$('.class_delivery_address').change(function () {
                if (this.value || this.value != ''){
                    var dom = [
                        ['id', '=', this.value],
                    ];
                    rpc.query({
                        model:  'res.partner',
                        method: 'search_read',
                        args: [dom],
                    }).then(function(result){
                        if (result){
                            if (result[0].city){
                                var branch_dom = [
                                    ['district_ids', 'in', result[0].city[0]]
                                ]
                                rpc.query({
                                    model:  'pos.branch',
                                    method: 'search_read',
                                    args: [branch_dom],
                                }).then(function(branch_rec){
                                    if (branch_rec){
                                        if ($('.class_district_branch')){
                                            if($('.class_district_branch').length >= 2){
                                                $('.class_district_branch')[1].value = branch_rec[0].id
                                                $('.class_branch_location')[1].value = branch_rec[0].location_id[0]
                                            }
                                            else{
                                                console.log(">>>>>>>>>>>>length is not more than 2...")
                                            }
                                        }
                                    }
                                })
                            }
                        }
                    });

                }
            });

            this.$('.confirm').click(function () {
                var fields = {};
                self.$('.booking_field').each(function (idx, el) {
                    fields[el.name] = el.value || false;
                });
                var $pricelist_id = $('#pricelist_id').val();
                var pricelist_id = parseInt($pricelist_id);
                if (typeof pricelist_id != 'number' || isNaN(pricelist_id)) {
                    return self.wrong_input('input[name="pricelist_id"]', "(*) Pricelist doesn't exist");
                } else {
                    self.passed_input('input[name="pricelist_id"]');
                }
                var order = self.pos.get_order();
                if (self.signed == false && self.pos.config.booking_orders_required_cashier_signature == true) {
                    return self.wrong_input('div[name="pos_signature"]', "(*) Please signature");
                } else {
                    self.passed_input('div[name="pos_signature"]');
                }
                var payment_partial_amount = parseFloat(fields['payment_partial_amount']);
                var $payment_partial_journal_id = $('#payment_partial_journal_id').val();
                var payment_partial_journal_id = parseInt($payment_partial_journal_id);
                if (payment_partial_amount > 0 && (typeof payment_partial_journal_id != 'number' || isNaN(payment_partial_journal_id))) {
                    return self.wrong_input('input[name="payment_partial_amount"]', "(*) Payment partial amount is not number");
                } else {
                    self.passed_input('input[name="payment_partial_amount"]');
                }
                if (payment_partial_amount < 0) {
                    return self.wrong_input('input[name="payment_partial_amount"]', "(*) Payment partial amount need bigger than 0");
                } else {
                    self.passed_input('input[id="payment_partial_amount"]');
                }
                if (isNaN(payment_partial_amount)) {
                    payment_partial_amount = 0;
                    payment_partial_journal_id = null;
                }
                var $payment_method_id = self.$('#payment_method_id').val();
                var payment_method_id = parseInt($payment_method_id);
                if (!payment_method_id) {
                    return self.wrong_input('input[id="payment_method_id"]', '(*) Payment Method is required');
                } else {
                    self.passed_input('input[id="payment_method_id"]');
                }
                var so_val = order.export_as_JSON();
                var value = {
                    delivery_address: fields['delivery_address'],
                    delivery_phone: fields['delivery_phone'],
                    delivery_date: fields['delivery_date'],
                    note: fields['note'],
                    creation_date: so_val['creation_date'],
                    payment_partial_amount: payment_partial_amount,
                    payment_partial_journal_id: payment_partial_journal_id,
                    origin: 'POS/' + so_val.name,
                    partner_id: so_val.partner_id,
                    pricelist_id: pricelist_id,
                    order_line: [],
                    signature: null,
                    book_order: true,
                    ean13: order['ean13'],
                    pos_branch: parseInt(fields['branch']),
                    pos_location_id: parseInt(fields['location']),
                };
                order['delivery_address'] = value['delivery_address'];
                order['delivery_date'] = value['delivery_date'];
                order['delivery_phone'] = value['delivery_phone'];
                order['note'] = value['note'];
                order['pos_location_id'] = value['pos_location_id'];
                var sign_datas = self.$(".pos_signature").jSignature("getData", "image");
                if (sign_datas && sign_datas[1]) {
                    value['signature'] = sign_datas[1];
                    order['signature'] = value['signature'];
                }
                for (var i = 0; i < so_val.lines.length; i++) {
                    var line = so_val.lines[i][2];
                    var product = self.pos.db.get_product_by_id(line.product_id);
                    var line_val = [0, 0, {
                        product_id: line.product_id,
                        price_unit: line.price_unit,
                        product_uom_qty: line.qty,
                        discount: line.discount,
                        product_uom: product.uom_id[0],
                    }];
                    if (line.uom_id) {
                        line_val['product_uom'] = line.uom_id
                    }
                    if (line.variants) {
                        line_val[2]['variant_ids'] = [[6, false, []]];
                        for (var j = 0; j < line.variants.length; j++) {
                            var variant = line.variants[j];
                            line_val[2]['variant_ids'][0][2].push(variant.id)
                        }
                    }
                    if (line.tax_ids) {
                        line_val[2]['tax_id'] = line.tax_ids;
                    }
                    if (line.note) {
                        line_val[2]['pos_note'] = line.note;
                    }
                    value.order_line.push(line_val);
                }
                self.pos.gui.show_popup('dialog', {
                    title: 'Great job !',
                    body: 'Order sending to backend now, waiting few seconds.',
                    color: 'info'
                });
                rpc.query({
                    model: 'sale.order',
                    method: 'booking_order',
                    args: [value]
                }).then(function (sale_order) {
                    self.pos.get_order().temporary = true;
                    self.pos.gui.show_screen('receipt');
                    return rpc.query({
                        model: 'sale.order',
                        method: 'action_confirm',
                        args:
                            [[sale_order['id']]],
                        context: {
                            pos: true
                        }
                    }).then(function () {
                        self.pos.trigger('refresh:sale_orders_screen');
//                        var orders = self.pos.db.get_sale_orders(1000);
//                        console.log(">>>>>>>>>>>all orders", orders)
//                        console.log(">>>>>>>>>>>all orders", sale_order)
//                    self.db.save_sale_orders(orders);
//                    self.render_sale_orders(self.pos.db.get_sale_orders(1000));
//                    self.pos.trigger('kitchen_order:send_to_kitchen_order');
    //                  Kitchen order code
                        var selectedOrder = self.pos.get_order();
                        selectedOrder.booking_order = true;
                        selectedOrder.initialize_validation_date();
                        var currentOrderLines = selectedOrder.get_orderlines();
                        var orderLines = [];
                        _.each(currentOrderLines,function(item) {
                            return orderLines.push(item.export_as_JSON());
                        });
                        if (orderLines.length === 0) {
                            return alert ('Please select product !');
                        } else {
                            self.pos.push_order(selectedOrder);
                        }
    //                  end

                        return self.pos.gui.show_popup('dialog', {
                            title: 'Done',
                            body: 'Order just confirmed',
                            color: 'success'
                        })
                    }).fail(function (error) {
                        return self.pos.query_backend_fail(error);
                    })

                }).fail(function (error) {
                    return self.pos.query_backend_fail(error);
                });
                // create register payment second
                if (payment_partial_amount > 0 && payment_partial_journal_id) {
                    var payment = {
                        partner_type: 'customer',
                        payment_type: 'inbound',
                        partner_id: so_val.partner_id,
                        amount: payment_partial_amount,
                        currency_id: self.pos.currency['id'],
                        payment_date: new Date(),
                        journal_id: payment_partial_journal_id,
                        payment_method_id: payment_method_id,
                    };
                    rpc.query({
                        model: 'account.payment',
                        method: 'create',
                        args:
                            [payment]
                    }).then(function (payment_id) {
                        return rpc.query({
                            model: 'account.payment',
                            method: 'post',
                            args: [payment_id],
                            context: {
                                payment_id: payment_id,
                            }
                        }).then(function (result) {
                            self.pos.gui.show_popup('dialog', {
                                title: 'Registered',
                                body: 'Order just register payment done',
                                color: 'success'
                            });
                        }).fail(function (error) {
                            return self.pos.query_backend_fail(error);
                        });
                    }).fail(function (error) {
                        return self.pos.query_backend_fail(error);
                    });
                }
            })
        }
    });
    gui.define_popup({
        name: 'popup_create_booking_order',
        widget: popup_create_booking_order
    });

    var PartnerAddressPopupWidget = PopupWidget.extend({
	    template: 'partner_address_popup',
	    show: function(options){
	        var self = this;
	        options = options || {};
	        this._super(options);
	        this.renderElement();
	        var order = this.pos.get_order();
	    },
	    click_confirm: function(){
	        var self = this;
	        var fields = {};
                self.$('.partner_address_input').each(function (idx, el) {
                    fields[el.name] = el.value || false;
                });
	        var order = this.pos.get_order();
	    	var partner_value = {
	    	    'parent_id': self.pos.get_order().get_client().id,
	    	    'name': fields['name'],
	    	    'type': 'delivery',
	    	    'street': fields['street'],
	    	    'city': fields['city'],
	    	    'zip': fields['zip'],
	    	    'country_id': fields['country_id'],
	    	    'email': fields['email'],
	    	    'phone': fields['phone'],
	    	    'mobile': fields['mobile'],
	    	}
	    	self._rpc({
                model: 'res.partner',
                method: 'create',
                args:
                    [partner_value]
            }).then(function (result) {
                self.pos.get_order().get_client().child_ids.push(result)
                self.reload_partners(result)
                var dom = [
                            ['id', '=', result],
                        ];
                self._rpc({
                    model:  'res.partner',
                    method: 'search_read',
                    args: [dom],
                }).then(function(resu){
                    if (resu){
                        self.pos.db.add_partners(resu)
                        var order = self.pos.get_order();
                        var pricelist = order['pricelist'];
                        if (!pricelist) {
                            pricelist = this.pos.default_pricelist;
                        }
//                        return self.gui.show_popup('popup_create_booking_order', {
//                            title: 'Create book order',
//                            pricelist: pricelist,
//                            order: order,
//                            client: order.get_client(),
//                            delivery_address: resu,
//                        });
                    }
                });
            });
            self.pos.trigger('client:save_changes');
            this.gui.close_popup();
            if (this.options.confirm) {
                this.options.confirm.call(this, fields);
            }
	    },
	    reload_partners: function(){
            var self = this;
            return this.pos.load_new_partners().then(function(){
                // partners may have changed in the backend
                self.partner_cache = new DomCache();

                self.render_list(self.pos.db.get_partners_sorted(1000));

                // update the currently assigned client if it has been changed in db.
                var curr_client = self.pos.get_order().get_client();
                if (curr_client) {
                    self.pos.get_order().set_client(self.pos.db.get_partner_by_id(curr_client.id));
                }
            });
        },
	    reload_partners: function (partner_id) {
            var self = this;
            return this.pos.load_new_partners(partner_id).then(function () {
                self.partner_cache = new screens.DomCache();
//                self.render_list(self._get_partners());
                var curr_client = self.pos.get_order().get_client();
                if (curr_client) {
                    self.pos.get_order().set_client(self.pos.db.get_partner_by_id(curr_client.id));
                }
            });
        },
	    renderElement: function(){
            this._super();
	    },
	});
	gui.define_popup({name:'partner_address_popup', widget: PartnerAddressPopupWidget});


});