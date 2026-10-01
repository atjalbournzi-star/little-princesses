# routes/__init__.py
# Master routes registry and Blueprint exporter

from routes.auth_bp import auth_bp
from routes.customers_bp import customers_bp
from routes.orders_bp import orders_bp
from routes.inventory_bp import inventory_bp
from routes.atelier_bp import atelier_bp
from routes.accounting_bp import accounting_bp
from routes.hr_bp import hr_bp
from routes.marketing_bp import marketing_bp
from routes.system_bp import system_bp

ALL_BLUEPRINTS = [
    auth_bp,
    customers_bp,
    orders_bp,
    inventory_bp,
    atelier_bp,
    accounting_bp,
    hr_bp,
    marketing_bp,
    system_bp,
]


def register_blueprints(app):
    """Registers all Domain-Driven Flask Blueprints with the Flask app instance."""
    for bp in ALL_BLUEPRINTS:
        app.register_blueprint(bp)
