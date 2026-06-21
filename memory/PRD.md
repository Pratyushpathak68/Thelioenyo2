# THE LIONEYO — Product Requirements

## Original Problem
Build the next-gen THE LIONEYO — a luxury streetwear ecommerce platform (Overlays / Represent / FOG Essentials caliber) with white-theme-first + dark mode, mobile-first, fully admin-controlled (no code edits post-deploy), Razorpay + Google Login + Cloudflare R2 + Google Sheets sync, SEO panel, partial COD, WhatsApp automation, coupon/referral systems, order tracking, reviews, wishlist, deployable to Hostinger.

## Architecture
- **Backend**: FastAPI + MongoDB (Motor). Modular `server.py`/`models.py`/`seed.py`. JWT (HS256) admin auth. Razorpay LIVE integrated. Standard Google OAuth 2.0 via tokeninfo verification. Cloudflare R2 fallback to local `/uploads/`. Sitemap + robots.
- **Frontend**: React 19 + Tailwind + shadcn/ui. Custom design system (Cabinet Grotesk + Satoshi via Fontshare). Sharp 0px radius. Edge-to-edge layouts. Marquee announcement bar. Theme-aware logos. Cart drawer + coupon popup + WhatsApp/Instagram social.
- **Admin** (`/admin`): Dashboard, Products, Collections, Orders, Coupons, Reviews, Settings (Brand/Logos, Hero, Shipping & COD, WhatsApp, Razorpay, R2, Google, Footer, Announcement Bar).

## Implemented (Feb 2026)
- Storefront: Home, Collection grids (responsive 3/2/1), Product detail (gallery, sizes, low stock, viewers, share, wishlist, accordion, related, reviews, size chart modal), Checkout (Razorpay prepaid + Partial COD ₹150 advance, **referral code input**), Order tracking with status timeline, Order success
- Admin: Login, Dashboard analytics (**now incl. top referrers + referral uses**), full Products CRUD (with image upload, sizes, duplicate, hide, **SEO meta editor**), Collections CRUD (**with SEO fields**), Orders status workflow (**auto-fires WhatsApp on shipped/delivered**), Coupons CRUD with popup flag, Reviews moderation, full Settings UI (**11 tabs incl. Referral System & Admin Security**)
- Coupons: WELCOME150 (popup, flat ₹150), LIONEYO10 (10% capped ₹500), INSTANT200 (flat ₹200)
- **Referral system**: backend validation, self-referral blocking, min order check, auto-tracking on payment, per-code stats aggregation, admin endpoint `/api/admin/referrals`
- **Razorpay webhook**: `/api/razorpay/webhook` with HMAC verify, handles payment.captured/order.paid/payment.failed, idempotent order updates, fires WA notifications
- **WhatsApp automation**: Meta Cloud API (token + phone_id) or generic gateway URL fallback, idempotent per-event tracking via `order.wa_notified`, templates for placed/shipped/delivered/cod_reminder, admin manual resend endpoint
- **Admin password change**: `POST /api/admin/change-password` + Settings → Admin Security UI tab
- SEO: sitemap.xml + robots.txt (root and /api routes), OG meta, slug-based URLs, per-product/collection meta editor
- Removed all "Made with Emergent" branding from public HTML; removed visual-edits dependency
- **Fixed**: `TypeError: destroy is not a function` crash on Admin Collections/Coupons/Reviews/Orders pages (useEffect async-function anti-pattern)

## Verified
- Backend: 28-test suite, 100% pass after fixes (duplicate handler + sitemap routing)
- Razorpay LIVE order creation returns valid `order_id`
- Signature verification rejects invalid sigs
- Google OAuth rejects invalid id_tokens (401)
- Referral validate happy path + self-referral block + invalid code (smoke tested Feb 2026)
- Admin password change rejects wrong current password (smoke tested)
- All 4 admin pages mount + tab navigation works without React unmount crash (Playwright)

## P1 Backlog (Next Iterations)
1. **Real Google Login UI** — frontend One Tap button on checkout (backend endpoint ready)
2. **Customer account pages** — order history, profile, wishlist sync with backend
3. **Recently Viewed + Frequently Bought Together**
4. **Verified-only reviews** — currently auto-flag verified; force pre-purchase check
5. **PWA / lazy image WebP optimization** for Lighthouse 95+
6. **Hybrid deploy** — Hostinger (frontend static build) + Render/Railway (FastAPI) + Atlas (DB)

## P2 Backlog
- Multi-image bulk upload UX with drag-reorder
- Inventory low-stock email alerts
- Multi-currency
- Analytics: most-shared, customer growth chart
- Cloudflare R2 access key/secret from user (currently missing — admin must add)
