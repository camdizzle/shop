# C2 3D Print Shop (Node.js + React)

Plesk-friendly online shop built with **Node.js (Express)** and **React (Vite)**.

## Production build
```bash
npm install
cp .env.example .env
npm run build
```

## Production start
```bash
npm run start
```
Server binds to `HOST` + `PORT` from environment (works with Plesk Node.js app config).

## Plesk deployment guide
1. Create a Node.js app in Plesk and set **Application Startup File** to `server/server.js`.
2. Upload repo files to your domain app directory.
3. In Plesk, set environment variables from `.env.example` (especially `JWT_SECRET`, `ADMIN_*`, `STRIPE_SECRET_KEY`, `CLIENT_ORIGIN`).
4. Run `npm install` from Plesk Node.js panel.
5. Run `npm run build` once to generate `dist/`.
6. Click **Restart App**.
7. Validate `https://your-domain/api/health` returns `{"ok":true}`.

## Security notes for Plesk
- Admin cookie is `httpOnly` and automatically `secure=true` when `NODE_ENV=production`.
- Keep `CLIENT_ORIGIN` set to your exact HTTPS domain.
- Use a long random `JWT_SECRET` and strong `ADMIN_PASSWORD`.

## Implemented features
- Product showcase and cart + Stripe checkout session flow.
- Central filament/color management for product creation.
- Admin login + create filament/product endpoints.
- Promotion banner for https://designer.camwow.tv.
