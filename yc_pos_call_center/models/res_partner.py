from odoo import models, fields, api
from odoo.exceptions import AccessError, MissingError, ValidationError, UserError


class Partner(models.Model):
    _inherit = "res.partner"

    city = fields.Many2one('res.district', string="City")


class District(models.Model):
    _name = "res.district"

    name = fields.Char(required=1)
