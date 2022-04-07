from odoo import models,fields,api

class ResPartner(models.Model):
	_inherit = "res.partner"

	is_parent = fields.Boolean()
	children_ids = fields.One2many("res.partner","parents_id")
	parents_id = fields.Many2one("res.partner")
	dob = fields.Date(string="Dob")