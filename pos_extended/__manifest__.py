# -*- coding: utf-8 -*-
{
    'name': "pos_extended",

    'summary': """
        Add Pos Configration in order line set children""",

    'description': """
        Select any order line in pos.Aftr that add a child of that parent in particular order lines.
    """,

    'author': "dhrushilbutani",
    'website': "",

    # Categories can be used to filter modules in modules listing
    # Check https://github.com/odoo/odoo/blob/12.0/odoo/addons/base/data/ir_module_category_data.xml
    # for the full list
    'category': 'Point Of Sale',
    'version': '0.1',

    # any module necessary for this one to work correctly
    'depends': [
                'point_of_sale',
                'base',
                ],

    # always loaded
    'data': [
        # 'security/ir.model.access.csv',
        'views/assets.xml',
        'views/res_partner_view.xml',
        'views/pos_order_line_view.xml'
        # 'views/assets.xml'
        
    ],
    'qweb': ['static/src/xml/pos.xml'],
    # only loaded in demonstration mode
}