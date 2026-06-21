# Admin Guide

Login at `/admin/login`. Default: `admin@lioneyo.com` / `Lioneyo@2026`.

## Modules
| Module       | What you can do |
|--------------|-----------------|
| Dashboard    | Revenue, orders, top viewed/sold |
| Products     | CRUD, hide, duplicate, manage sizes & stock, upload images, size chart |
| Collections  | Create universes (Anime, Streetwear, etc.), feature on homepage |
| Orders       | View, update status (Placed → Delivered), see address |
| Coupons      | Flat/percent, min order, expiry, mark as popup |
| Reviews      | Approve/reject/delete, see verified-buyer badge |
| Settings     | Logos, hero, shipping, COD, WhatsApp, Razorpay, Cloudflare R2, Google, footer, announcement bar |

## Common Tasks

**Change site logos**: Settings → Brand & Logos → upload light/dark versions.

**Update hero**: Settings → Hero Section → text + image/video.

**Create coupon**: Coupons → New → set type, value, min order; tick "Show in Popup" for site-wide popup.

**Add product**: Products → New → name, slug, price, sale price, images, sizes & stock, fabric, fit, GSM, care.

**Adjust shipping**: Settings → Shipping & COD → free shipping threshold, COD advance, COD fee.

**Update WhatsApp number**: Settings → WhatsApp → number + templates (use `{order}`, `{tracking}` placeholders).

**Configure Razorpay**: Settings → Razorpay → key_id, key_secret, webhook_secret. Updates live without redeploy.

**Configure Cloudflare R2**: Settings → Cloudflare R2 → fill all five fields (Account ID, Bucket, Access Key, Secret Key, Public URL). After saving, all new uploads go to R2 automatically.

**Configure Google Login**: Settings → Google → client_id (and add origin to Google Cloud Console).
