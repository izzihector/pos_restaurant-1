from odoo import models,fields,api

			
class PosOrderLineExtend(models.Model):
	
	_inherit = "pos.order.line"

	children_ids = fields.Many2many("res.partner","children_and_pos_order_relation",string="Children")
	