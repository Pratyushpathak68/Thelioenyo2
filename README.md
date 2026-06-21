# THE LIONEYO — Premium Streetwear Ecommerce

Production-ready luxury fashion platform built with FastAPI + MongoDB + React.

## Stack
- **Backend**: FastAPI, MongoDB (Motor), Razorpay, Google OAuth, Cloudflare R2 (admin-configurable)
- **Frontend**: React 19, Tailwind CSS, shadcn/ui, Framer Motion, Lenis (smooth scroll), Sonner
- **Fonts**: Cabinet Grotesk + Satoshi (via Fontshare CDN)

## Quick Start (Local)
1. `cd backend && pip install -r requirements.txt`
2. Copy `.env.example` → `backend/.env` and fill values
3. `uvicorn server:app --reload --port 8001`
4. `cd frontend && yarn && yarn start`

## Routes
- `/` — Home with hero, featured, collections
- `/collection/:slug` — Collection listing (slugs: `all`, `anime`, `streetwear`, `essentials`)
- `/product/:slug` — Product detail with gallery, sizes, reviews
- `/checkout` — Checkout with Razorpay + Partial COD
- `/track`, `/track/:orderNumber` — Order tracking
- `/admin` — Admin panel (login required)

## Docs
- `PROJECT_STRUCTURE.md`
- `DEPLOYMENT_GUIDE.md`
- `ADMIN_GUIDE.md`
- `ENVIRONMENT_VARIABLES.md`

## Default Admin
- Email: `admin@lioneyo.com`
- Password: `Lioneyo@2026` (change immediately after first login)
