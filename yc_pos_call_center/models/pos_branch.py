from odoo import models, fields, api
from odoo.exceptions import AccessError, MissingError, ValidationError, UserError


class POSBranch(models.Model):
    _inherit = "pos.branch"

    district_ids = fields.Many2many('res.district', 'district_branch_rel', string="Districts")
    location_id = fields.Many2one('stock.location', string="Location")


class SaleOrder(models.Model):
    _inherit = "sale.order"

    pos_branch = fields.Many2one('pos.branch', string="Branch")
    active = fields.Boolean(string="Active", default=True)
    delivery_address = fields.Many2one('res.partner', 'Delivery address')


class PosOrder(models.Model):
    _inherit = "pos.order"

    active = fields.Boolean(string="Active", default=True)

    @api.model
    def create(self, vals):
        order = super(PosOrder, self).create(vals)
        print(">>>>>>>>>>>>>>>>vals", vals)
        return order
