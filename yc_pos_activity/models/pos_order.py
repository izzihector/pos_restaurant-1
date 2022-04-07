from odoo import models, fields, api
from odoo.exceptions import AccessError, MissingError, ValidationError, UserError


class POSOrder(models.Model):
    _inherit = "pos.order"

    lines = fields.One2many('pos.order.line', 'order_id', string='Order Lines',
                            states={'draft': [('readonly', False)], 'paid': [('readonly', True)]},
                            readonly=True, copy=True)
    activity_lines = fields.One2many('activity.product', 'order_id', string="Activity")

    # status_id = fields.Selection([('draft', 'Draft'), ('inventory_deducted',
    #                                                    'Inventory Deducted')], default='draft')

    @api.multi
    def activity_add_product(self):
        sp_product_list = []
        for rec in self.lines:
            if rec.product_id.special_activity:
                sp_product_list.append(rec.product_id.id)
        view = self.env.ref('yc_pos_activity.view_activity_product_form')
        activity_id = self.env['activity.product'].search([('order_id', '=', self.id)], limit=1)
        wiz = False
        if activity_id:
            wiz = activity_id
        else:
            wiz = self.env['activity.product'].create({'order_id': self.id, 'special_product_ids': sp_product_list})
        print(">>>>>>>>>>>>>sp_product_list>", sp_product_list)
        return {
            'name': 'Activity Product',
            'type': 'ir.actions.act_window',
            'view_type': 'form',
            'view_mode': 'form',
            'res_model': 'activity.product',
            'views': [(view.id, 'form')],
            'view_id': view.id,
            'target': 'new',
            'res_id': wiz.id,
            # 'context': {'default_special_product_ids': sp_product_list},
        }

    # def action_confrim(self):
    #     if self.activity_lines:
    #         for data1 in self.activity_lines.order_lines:
    #             for product in data1.product_id:
    #                 print('-------------confrim call')
    #                 picking = self.env['stock.move.line'].search(
    #                     [('product_id', '=', product.id)], limit=1)
    #                 print('---------------picking', picking)
    #                 if picking:
    #                     print('------------quantity', picking.qty_done)
    #                     data = picking.write({
    #                         'qty_done': picking.qty_done - data1.qty,
    #                     })
    #                     print('-------------data', data)
    #                     self.status_id = 'inventory_deducted'
    #
    # def action_reset(self):
    #     if self.activity_lines:
    #         for data1 in self.activity_lines.order_lines:
    #             for product in data1.product_id:
    #                 print('-------------reset call')
    #                 picking = self.env['stock.move.line'].search(
    #                     [('product_id', '=', product.id)], limit=1)
    #                 print('---------------picking', picking)
    #                 product_qty = picking.qty_done
    #                 print('-----------------product_qty---', product_qty)
    #                 if picking:
    #                     if picking.qty_done != 0:
    #                         if not data1.qty == product_qty:
    #                             print('------------quantity', picking.qty_done)
    #                             data = picking.write({
    #                                 'qty_done': picking.qty_done + data1.qty,
    #                             })
    #                             print('-------------data', data)
    #                             self.status_id = 'draft'
    #                         else:
    #                             raise ValidationError(
    #                                 "You Cannot Reset Because Your Quantity is Greater then Actual Quantity")
    #                     elif picking.qty_done == 0:
    #                         print('------------quantity', data1.quantity)
    #                         data = picking.write({
    #                             'qty_done': picking.qty_done + data1.qty,
    #                         })
    #                         print('-------------data elif', data)
    #                         self.status_id = 'draft'
    #
    #                     else:
    #                         raise ValidationError(
    #                             "You Cannot Reset negative quantity")


class ActivityAddWizard(models.Model):
    _name = 'activity.product'

    order_id = fields.Many2one('pos.order', "Order Id",
                               required=True)
    special_product_ids = fields.Many2many('product.product', 'activity_prod_rel',
                                           string="Special Products", compute='_get_value')
    allowed_product_ids = fields.Many2many('product.product', 'allowed_product_rel',
                                           string="Allowed Products", compute='_get_value')
    order_lines = fields.One2many('activity.product.line', 'activity_id', string='Lines')

    @api.onchange('order_lines')
    def _constraint_for_activity(self):
        pr_qty_dict = {}
        if self.order_lines:
            for rec in self.order_lines:
                if pr_qty_dict.get(rec.product_id):
                    prv_qty = pr_qty_dict.get(rec.product_id)
                    new_qty = prv_qty + rec.qty
                    pr_qty_dict[rec.product_id] = new_qty
                else:
                    pr_qty_dict[rec.product_id] = rec.qty

        if self.special_product_ids:
            for rec in self.special_product_ids:
                order_line_id = self.env['pos.order.line'].search(
                    [('order_id', '=', self.order_id.id), ('product_id', '=', rec.id)])
                mult_qty = 0
                if order_line_id:
                    for data in order_line_id:
                        mult_qty += data.qty

                allowed_activity = mult_qty * rec.allowed_qty
                count = 0
                for data in rec.activity_product_ids:
                    if pr_qty_dict.get(data):
                        count = count + pr_qty_dict.get(data)
                        if count > allowed_activity:
                            raise ValidationError("% s is allowed only % s activity." % (rec.name, allowed_activity))
        print('>>>>>>>>>>>>>>pr_qty_dict', pr_qty_dict)

    def _get_value(self):
        sp_product_list = []
        allowed_product_list = []
        if self.order_id:
            pos_order_id = self.env['pos.order'].search([('id', '=', self.order_id.id)])
            for rec in pos_order_id.lines:
                if rec.product_id.special_activity:
                    sp_product_list.append(rec.product_id.id)
                    for pr in rec.product_id.activity_product_ids:
                        allowed_product_list.append(pr.id)

        print(">>>>>ssss", sp_product_list)
        print(">>>>>allowed_product_list", allowed_product_list)
        self.special_product_ids = sp_product_list
        self.allowed_product_ids = allowed_product_list

    # @api.onchange('special_product_ids')
    # def onchange_special_product_ids(self):
    #     print(">>>>>>>>>>>>calling this")
    #     listids = []
    #     if self.special_product_ids:
    #         for each in self.special_product_ids:
    #             listids.append(each.id)
    #             domain = {'order_lines.product_id': [('id', 'in', [72])]}
    #             print(">>>>>>>>>>domain", domain)
    #             return {'domain': domain}

    def act_submit(self):
        for rec in self.order_lines:
            pos_order_line = self.env['pos.order.line'].search([('activity_line_id', '=', rec.id)])
            if not pos_order_line:
                self.env['pos.order.line'].create({
                    'order_id': self.order_id.id,
                    'product_id': rec.product_id.id,
                    'qty': rec.qty,
                    'price_subtotal': 0,
                    'price_subtotal_incl': 0,
                    'activity_line_id': rec.id
                })
            else:
                pos_order_line.write({
                    'product_id': rec.product_id.id,
                    'qty': rec.qty,
                })
            pos_activity_line = self.env['pos.order.lines.custom'].search([('activity_line_id', '=', rec.id)])
            if not pos_activity_line:
                self.env['pos.order.lines.custom'].create({
                    'pos_order_id': self.order_id.id,
                    'product_id': rec.product_id.id,
                    'quantity': rec.qty,
                    'activity_line_id': rec.id
                })
            else:
                pos_activity_line.write({
                    'product_id': rec.product_id.id,
                    'quantity': rec.qty,
                })



class ActivityProductLines(models.Model):
    _name = "activity.product.line"

    activity_id = fields.Many2one('activity.product', string="Activity")
    allowed_product_ids = fields.Many2many('product.product', 'act_prod_product_rel',
                                           string="Allowed Products", related='activity_id.allowed_product_ids')
    product_id = fields.Many2one('product.product', string="Product", required=1)
    qty = fields.Float(string="QTY")


class SpecialActivityProduct(models.Model):
    _name = 'special.product.lines'

    activity_id = fields.Many2one('activity.product', "Activity")
    product_id = fields.Many2one('product.product', string="Product", required=1)
    qty = fields.Float(string="QTY")


class POSOrderLine(models.Model):
    _inherit = "pos.order.line"

    activity_line_id = fields.Many2one("activity.product.line", string="Activity ID", ondelete="cascade")
