# Environment Variables

## Backend `/app/backend/.env`

| Key | Required | Purpose |
|-----|----------|---------|
| `MONGO_URL` | yes | MongoDB connection string |
| `DB_NAME` | yes | Database name (`lioneyo`) |
| `CORS_ORIGINS` | yes | Comma list (`*` in dev, exact origins in prod) |
| `JWT_SECRET` | yes | Random long string for JWT signing |
| `RAZORPAY_KEY_ID` | yes | Razorpay API key |
| `RAZORPAY_KEY_SECRET` | yes | Razorpay secret |
| `GOOGLE_CLIENT_ID` | yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | yes | Google OAuth client secret |
| `CLOUDFLARE_ACCOUNT_ID` | no | R2 account (admin-editable too) |
| `CLOUDFLARE_R2_ENDPOINT` | no | R2 endpoint (admin-editable too) |
| `GOOGLE_SHEETS_WEBHOOK` | no | Apps Script Web App URL |
| `PUBLIC_SITE_URL` | yes (prod) | Used in `sitemap.xml` / `robots.txt` |

## Frontend `/app/frontend/.env`

| Key | Required | Purpose |
|-----|----------|---------|
| `REACT_APP_BACKEND_URL` | yes | Backend base URL (e.g. `https://lioneyo.com`) |

## Notes
- **Never commit `.env` files** to git. Use `.env.example` instead.
- All admin-overridable values (Razorpay, R2, Google, shipping, COD, WhatsApp) read from `settings` collection first, falling back to env. This lets you rotate keys live via `/admin/settings` without redeploys.
