import os
from decimal import Decimal

import stripe
from flask import Flask, abort, flash, jsonify, redirect, render_template, request, session, url_for
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_sqlalchemy import SQLAlchemy
from flask_wtf import FlaskForm
from wtforms import DecimalField, IntegerField, PasswordField, SelectField, StringField, SubmitField, TextAreaField
from wtforms.validators import DataRequired, Length, NumberRange, URL

db = SQLAlchemy()
limiter = Limiter(key_func=get_remote_address, default_limits=["200/hour", "40/minute"])


class Filament(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    material = db.Column(db.String(80), nullable=False)
    color = db.Column(db.String(80), nullable=False)
    sku = db.Column(db.String(40), unique=True, nullable=False)
    stock_grams = db.Column(db.Integer, nullable=False, default=0)


class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(140), nullable=False)
    description = db.Column(db.Text, nullable=False)
    image_url = db.Column(db.String(500), nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    category = db.Column(db.String(80), nullable=False)
    filament_id = db.Column(db.Integer, db.ForeignKey("filament.id"), nullable=False)
    filament = db.relationship("Filament")


class FilamentForm(FlaskForm):
    material = StringField("Material", validators=[DataRequired(), Length(max=80)])
    color = StringField("Color", validators=[DataRequired(), Length(max=80)])
    sku = StringField("SKU", validators=[DataRequired(), Length(max=40)])
    stock_grams = IntegerField("Stock (grams)", validators=[DataRequired(), NumberRange(min=0)])
    submit = SubmitField("Save Filament")


class ProductForm(FlaskForm):
    name = StringField("Name", validators=[DataRequired(), Length(max=140)])
    description = TextAreaField("Description", validators=[DataRequired(), Length(min=20)])
    image_url = StringField("Image URL", validators=[DataRequired(), URL(), Length(max=500)])
    price = DecimalField("Price", validators=[DataRequired(), NumberRange(min=0.01)], places=2)
    category = StringField("Category", validators=[DataRequired(), Length(max=80)])
    filament_id = SelectField("Filament", coerce=int, validators=[DataRequired()])
    submit = SubmitField("Publish Product")


class LoginForm(FlaskForm):
    password = PasswordField("Admin Password", validators=[DataRequired()])
    submit = SubmitField("Login")


def _money_to_cents(amount: Decimal) -> int:
    return int(amount * 100)


def _cart_total(items):
    return sum(item["price"] * item["quantity"] for item in items)


def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "change-me-in-prod")
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///shop.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["ADMIN_PASSWORD"] = os.getenv("ADMIN_PASSWORD", "change-this-password")

    stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")

    db.init_app(app)
    limiter.init_app(app)

    @app.after_request
    def security_headers(resp):
        resp.headers["X-Content-Type-Options"] = "nosniff"
        resp.headers["X-Frame-Options"] = "DENY"
        resp.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        resp.headers["Content-Security-Policy"] = "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self' https://js.stripe.com; frame-src https://js.stripe.com https://checkout.stripe.com"
        return resp

    with app.app_context():
        db.create_all()

    def admin_required():
        if not session.get("is_admin"):
            abort(403)

    @app.route("/")
    def home():
        products = Product.query.order_by(Product.id.desc()).all()
        return render_template("home.html", products=products)

    @app.route("/cart")
    def cart_view():
        return render_template("cart.html", cart_items=session.get("cart", []), total=_cart_total(session.get("cart", [])))

    @app.post("/cart/add/<int:product_id>")
    def add_to_cart(product_id):
        product = Product.query.get_or_404(product_id)
        cart = session.setdefault("cart", [])
        for item in cart:
            if item["id"] == product.id:
                item["quantity"] += 1
                break
        else:
            cart.append({"id": product.id, "name": product.name, "price": float(product.price), "quantity": 1})
        session.modified = True
        flash(f"Added {product.name} to cart.", "success")
        return redirect(url_for("home"))

    @app.post("/cart/remove/<int:product_id>")
    def remove_from_cart(product_id):
        cart = session.get("cart", [])
        session["cart"] = [item for item in cart if item["id"] != product_id]
        session.modified = True
        return redirect(url_for("cart_view"))

    @app.post("/checkout")
    @limiter.limit("10/minute")
    def checkout():
        cart = session.get("cart", [])
        if not cart:
            flash("Your cart is empty.", "warning")
            return redirect(url_for("cart_view"))
        if not stripe.api_key:
            flash("Stripe key missing. Set STRIPE_SECRET_KEY.", "danger")
            return redirect(url_for("cart_view"))

        line_items = [{"price_data": {"currency": "usd", "product_data": {"name": item["name"]}, "unit_amount": int(item["price"] * 100)}, "quantity": item["quantity"]} for item in cart]
        checkout_session = stripe.checkout.Session.create(
            line_items=line_items,
            mode="payment",
            success_url=request.host_url.rstrip("/") + url_for("checkout_success"),
            cancel_url=request.host_url.rstrip("/") + url_for("cart_view"),
        )
        return redirect(checkout_session.url, code=303)

    @app.route("/checkout/success")
    def checkout_success():
        session["cart"] = []
        flash("Payment complete. Thanks for your order!", "success")
        return redirect(url_for("home"))

    @app.route("/admin/login", methods=["GET", "POST"])
    @limiter.limit("10/minute")
    def admin_login():
        form = LoginForm()
        if form.validate_on_submit():
            if form.password.data == app.config["ADMIN_PASSWORD"]:
                session["is_admin"] = True
                return redirect(url_for("admin_dashboard"))
            flash("Invalid password.", "danger")
        return render_template("admin_login.html", form=form)

    @app.route("/admin/logout")
    def admin_logout():
        session.pop("is_admin", None)
        return redirect(url_for("home"))

    @app.route("/admin")
    def admin_dashboard():
        admin_required()
        return render_template("admin_dashboard.html", products=Product.query.all(), filaments=Filament.query.all())

    @app.route("/admin/filaments/new", methods=["GET", "POST"])
    def admin_filament_new():
        admin_required()
        form = FilamentForm()
        if form.validate_on_submit():
            db.session.add(Filament(**form.data, submit=None))
            db.session.commit()
            return redirect(url_for("admin_dashboard"))
        return render_template("admin_filament_form.html", form=form)

    @app.route("/admin/products/new", methods=["GET", "POST"])
    def admin_product_new():
        admin_required()
        form = ProductForm()
        form.filament_id.choices = [(f.id, f"{f.material} - {f.color} ({f.sku})") for f in Filament.query.all()]
        if not form.filament_id.choices:
            flash("Add filament entries before products.", "warning")
            return redirect(url_for("admin_filament_new"))
        if form.validate_on_submit():
            payload = {k: v for k, v in form.data.items() if k not in ["csrf_token", "submit"]}
            db.session.add(Product(**payload))
            db.session.commit()
            return redirect(url_for("admin_dashboard"))
        return render_template("admin_product_form.html", form=form)

    @app.route("/api/products")
    def api_products():
        return jsonify([
            {"id": p.id, "name": p.name, "price": float(p.price), "category": p.category, "filament": f"{p.filament.material}/{p.filament.color}"}
            for p in Product.query.all()
        ])

    return app
