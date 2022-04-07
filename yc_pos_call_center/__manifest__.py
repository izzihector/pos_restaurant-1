# -*- coding: utf-8 -*-

{
    'name': 'POS Central Call Center',
    'version': '12.0.1.0.0',
    'category': '',
    'author': 'Yatrik Chauhan',
    'summary': 'POS Central Call Center',
    'website': '',
    'depends': ['base', 'pos_retail', 'sale', 'sales_team'],
    'data': [
        'security/ir.model.access.csv',
        'security/ir_rule.xml',
        'views/res_partner_view.xml',
        'views/assests.xml',
        'views/pos_district_branch_view.xml',
    ],
    'demo': [],
    'qweb': [
        'static/src/xml/*.xml',
    ],
    'license': 'AGPL-3',
    'support': '',
    'installable': True,
    'auto_install': False,
    'price': 0.0,
    'currency': 'EUR',
}
