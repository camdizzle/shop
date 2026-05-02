# C2 3D Print Shop (Node.js + React)

A modern online shop built with **Node.js (Express)** and **React (Vite)**.

## Implemented requirements
- Product showcase for added products.
- Central filament/color system used in product creation.
- Admin login and admin product/filament creation.
- Promotion for https://designer.camwow.tv in the header.
- Modern UI with React components.
- Stripe Checkout flow.
- Security baseline with Helmet, JWT httpOnly cookie auth, CORS, JSON body limits.

## Run
```bash
npm install
cp .env.example .env
npm run dev
```
- React app: http://localhost:5173
- API: http://localhost:4000

## Suggested improvements
- Move admin into protected routes with role-based UI.
- Add Stripe webhook verification and order persistence.
- Add Zod validation + rate limiting.
- Add image upload storage (S3/Cloudinary).
- Add Playwright/Cypress E2E tests.
