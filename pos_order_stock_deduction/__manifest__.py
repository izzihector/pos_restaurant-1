{
    'name': 'POS STOCK DEDUCTION',
    'depends': ['base', 'point_of_sale', 'stock', 'pos_cash_rounding', 'yc_pos_activity'],
    'data': [
        'security/ir.model.access.csv',
        'views/pos_order.xml',
    ],


    'installable': True,
    'application': True,
    'auto_install': False,
}
