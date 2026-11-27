# routes/__init__.py
# Master routes registry and Blueprint exporter

from routes.auth_bp import auth_bp
from routes.customers_bp import customers_bp
from routes.orders_bp import orders_bp
from routes.products_bp import products_bp
from routes.inventory_bp import inventory_bp
from routes.warehouses_bp import warehouses_bp
from routes.ready_products_bp import ready_products_bp
from routes.atelier_bp import atelier_bp
from routes.accounting_bp import accounting_bp
from routes.accounting_reports_bp import accounting_reports_bp
from routes.hr_bp import hr_bp
from routes.marketing_bp import marketing_bp
from routes.system_bp import system_bp
from routes.measurement_bp import measurement_bp
from routes.periods_bp import periods_bp
from routes.size_matrices_bp import size_matrices_bp
from routes.material_custody_bp import material_custody_bp
from routes.bto_bp import bto_bp
from routes.tailoring_bp import tailoring_bp

ALL_BLUEPRINTS = [
    auth_bp,
    customers_bp,
    orders_bp,
    products_bp,
    inventory_bp,
    warehouses_bp,
    ready_products_bp,
    atelier_bp,
    accounting_bp,
    accounting_reports_bp,
    hr_bp,
    marketing_bp,
    system_bp,
    measurement_bp,
    periods_bp,
    size_matrices_bp,
    material_custody_bp,
    bto_bp,
    tailoring_bp,
]


def register_blueprints(app):
    """Registers all Domain-Driven Flask Blueprints with the Flask app instance."""
    for bp in ALL_BLUEPRINTS:
        app.register_blueprint(bp)
