# C2 3D Print Shop

Production-ready starter eCommerce web app for a 3D printing company.

## Features implemented

- Product showcase grid with image, price, description, and assigned filament profile.
- Central filament/color management library (material + color + SKU + stock grams) linked to product creation.
- Password-protected admin area for adding filament records and products quickly.
- Session cart with add/remove and Stripe Checkout integration.
- Built-in ad banner for your sister product: https://designer.camwow.tv.
- Security hardening basics:
  - CSRF protection (Flask-WTF forms)
  - Rate limiting on login + checkout endpoints
  - Security headers (CSP, X-Frame-Options, Referrer-Policy, etc.)
  - Server-side validation for admin/product forms

## Quick start

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python run.py
```

Visit:
- Store: http://127.0.0.1:5000/
- Admin login: http://127.0.0.1:5000/admin/login

## Environment variables

Create a `.env` file:

```env
SECRET_KEY=replace-with-random-value
ADMIN_PASSWORD=replace-with-strong-password
DATABASE_URL=sqlite:///shop.db
STRIPE_SECRET_KEY=sk_test_...
```

## Recommended next upgrades

1. Add user accounts + order history + email receipts.
2. Add inventory subtraction and low-stock alerts on checkout.
3. Add webhook verification for Stripe checkout completion.
4. Add object storage for uploaded product images instead of URL-only input.
5. Add role-based admin permissions + audit logs.
6. Add SAST/DAST and dependency vulnerability scanning in CI.
