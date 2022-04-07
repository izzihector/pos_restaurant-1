from odoo import models, fields
from odoo.exceptions import UserError, ValidationError


class POSOrder(models.Model):

    _inherit = 'pos.order'

    status_id = fields.Selection([('draft', 'Draft'), ('inventory_deducted',
                                                       'Inventory Deducted')], default='draft')

    pos_order_lines_ids = fields.One2many(
        'pos.order.lines.custom', 'pos_order_id')

    def action_confrim(self):

        for data1 in self.pos_order_lines_ids:
            for product in data1.product_id:
                print('-------------confrim call')
                picking = self.env['stock.move.line'].search(
                    [('product_id', '=', product.id)], limit=1)
                print('---------------picking', picking)
                if picking:
                    print('------------quantity', picking.qty_done)
                    data = picking.write({
                        'qty_done': picking.qty_done-data1.quantity,
                    })
                    print('-------------data', data)

        self.status_id = 'inventory_deducted'

    def action_reset(self):

        for data1 in self.pos_order_lines_ids:
            for product in data1.product_id:
                print('-------------reset call')
                picking = self.env['stock.move.line'].search(
                    [('product_id', '=', product.id)], limit=1)
                print('---------------picking', picking)
                product_qty = picking.qty_done
                print('-----------------product_qty---', product_qty)
                if picking:
                    if picking.qty_done != 0:
                        if not data1.quantity == product_qty:
                            print('------------quantity', picking.qty_done)
                            data = picking.write({
                                'qty_done': picking.qty_done+data1.quantity,
                            })
                            print('-------------data', data)
                            self.status_id = 'draft'
                        else:
                            raise ValidationError(
                                "You Cannot Reset Because Your Quantity is Greater then Actual Quantity")
                    elif picking.qty_done == 0:
                        print('------------quantity', data1.quantity)
                        data = picking.write({
                            'qty_done': picking.qty_done+data1.quantity,
                        })
                        print('-------------data elif', data)
                        self.status_id = 'draft'

                    else:
                        raise ValidationError(
                            "You Cannot Reset negative quantity")

        # print('---------------reset call')
        # picking = self.env['stock.move.line'].search(
        #     [('product_id', '=', self.product_id.id)])
        # print('---------------picking', picking)
        # product_qty = picking.qty_done
        # if picking:
        #     for line in picking:
        #         if line.qty_done != 0:
        #             if self.quantity <= product_qty:
        #                 print('------------quantity', line.qty_done)
        #                 data = line.write({
        #                     'qty_done': line.qty_done+self.quantity,
        #                 })
        #                 print('-------------data', data)

        #             else:
        #                 raise ValidationError(
        #                     "You Cannot Reset Because Your Quantity is Greater then Actual Quantity")
        #         else:
        #             raise ValidationError(
        #                 "You Cannot Reset negative quantity")


class POSOrderLinesCustom(models.Model):

    _name = 'pos.order.lines.custom'

    pos_order_id = fields.Many2one('pos.order')

    product_id = fields.Many2one('product.product', string='Product')

    quantity = fields.Float(string='Quantity')

    activity_line_id = fields.Many2one("activity.product.line", string="Activity ID", ondelete="cascade")
