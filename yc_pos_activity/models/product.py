from odoo import models, fields, api


class Product(models.Model):
    _inherit = "product.template"

    special_activity = fields.Boolean(string="Special Activity Product")
    allowed_qty = fields.Integer(string="Allowed QTY")
    activity_product_ids = fields.Many2many('product.product', 'special_product_rel', 'product_id', 'activity_id', string="Activity Products")

