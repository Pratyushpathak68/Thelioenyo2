# THE LIONEYO — Product Requirements

## Original Problem
Build the next-gen THE LIONEYO — a luxury streetwear ecommerce platform (Overlays / Represent / FOG Essentials caliber) with white-theme-first + dark mode, mobile-first, fully admin-controlled (no code edits post-deploy), Razorpay + Google Login + Cloudflare R2 + Google Sheets sync, SEO panel, partial COD, WhatsApp automation, coupon/referral systems, order tracking, reviews, wishlist, deployable to Hostinger.

## Architecture
- **Backend**: FastAPI + MongoDB (Motor). Modular `server.py`/`models.py`/`seed.py`. JWT (HS256) admin auth. Razorpay LIVE integrated. Standard Google OAuth 2.0 via tokeninfo verification. Cloudflare R2 fallback to local `/uploads/`. Sitemap + robots.
- **Frontend**: React 19 + Tailwind + shadcn/ui. Custom design system (Cabinet Grotesk + Satoshi via Fontshare). Sharp 0px radius. Edge-to-edge layouts. Marquee announcement bar. Theme-aware logos. Cart drawer + coupon popup + WhatsApp/Instagram social.
- **Admin** (`/admin`): Dashboard, Products, Collections, Orders, Coupons, Reviews, Settings (Brand/Logos, Hero, Shipping & COD, WhatsApp, Razorpay, R2, Google, Footer, Announcement Bar).

## Implemented (Feb 2026)
- Storefront: Home, Collection grids (responsive 3/2/1), Product detail (gallery, sizes, low stock, viewers, share, wishlist, accordion, related, reviews, size chart modal), Checkout (Razorpay prepaid + Partial COD ₹150 advance), Order tracking with status timeline, Order success
- Admin: Login, Dashboard analytics, full Products CRUD (with image upload, sizes, duplicate, hide), Collections CRUD, Orders status workflow, Coupons CRUD with popup flag, Reviews moderation, full Settings UI (9 tabs)
- Coupons: WELCOME150 (popup, flat ₹150), LIONEYO10 (10% capped ₹500), INSTANT200 (flat ₹200)
- SEO: sitemap.xml + robots.txt (root and /api routes), OG meta, slug-based URLs
- Removed all "Made with Emergent" branding from public HTML; removed visual-edits dependency

## Verified
- Backend: 28-test suite, 100% pass after fixes (duplicate handler + sitemap routing)
- Razorpay LIVE order creation returns valid `order_id`
- Signature verification rejects invalid sigs
- Google OAuth rejects invalid id_tokens (401)

## P1 Backlog (Next Iterations)
1. **Real Google Login UI** — frontend One Tap button on checkout (backend endpoint ready)
2. **Customer account pages** — order history, profile, wishlist sync with backend
3. **Referral system UI** — referral code share, attribution tracking on checkout
4. **Razorpay webhook** — server-to-server payment confirmations + auto WhatsApp triggers
5. **WhatsApp automation** — wire templates to send via WA Cloud API (currently number stored but no automated send)
6. **SEO panel** — dedicated meta editor per product/collection (model fields exist; UI partial)
7. **Recently Viewed + Frequently Bought Together**
8. **Verified-only reviews** — currently auto-flag verified; force pre-purchase check
9. **TypeScript migration** (user explicitly asked; deferred from MVP due to scope)
10. **PWA / lazy image WebP optimization** for Lighthouse 95+

## P2 Backlog
- Multi-image bulk upload UX with drag-reorder
- Inventory low-stock email alerts
- Multi-currency
- Analytics: most-shared, customer growth chart
- Cloudflare R2 access key/secret from user (currently missing — admin must add)
