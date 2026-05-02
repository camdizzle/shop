# C2 3D Print Shop (Node.js + React)

A modern online shop built with **Node.js (Express)** and **React (Vite)**.

## Production-first run (recommended)
```bash
npm install
cp .env.example .env
npm run build
npm run start
```
Then open: http://localhost:4000

## Development run (hot reload)
```bash
npm run dev
```

## Implemented requirements
- Product showcase for added products.
- Central filament/color system used in product creation.
- Admin login and admin product/filament creation.
- Promotion for https://designer.camwow.tv in the header.
- Stripe Checkout flow.
- Security baseline with Helmet, JWT httpOnly cookie auth, CORS, JSON body limits.
