# Deployment Guide — Hostinger VPS

## Prerequisites
- Hostinger VPS (KVM 2 or higher recommended for production)
- Node 20.x, Python 3.11+, MongoDB Atlas account (or self-hosted)
- Domain `lioneyo.com` pointed to VPS IP

## 1. Server Setup
```bash
sudo apt update && sudo apt install -y nginx python3-pip python3-venv nodejs npm git
sudo npm install -g yarn pm2
```

## 2. Clone & Configure
```bash
cd /var/www && git clone <repo> lioneyo && cd lioneyo
cp backend/.env.example backend/.env
# Edit with production MONGO_URL (Atlas), RAZORPAY keys, GOOGLE_CLIENT_ID/SECRET, etc.
```

## 3. Backend
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
pm2 start "uvicorn server:app --host 0.0.0.0 --port 8001" --name lioneyo-api
```

## 4. Frontend
```bash
cd ../frontend
yarn install --frozen-lockfile
# Set REACT_APP_BACKEND_URL=https://lioneyo.com in .env
yarn build
```

## 5. Nginx
```nginx
server {
  listen 80;
  server_name lioneyo.com www.lioneyo.com;

  location /api/ { proxy_pass http://127.0.0.1:8001; proxy_set_header Host $host; }
  location /uploads/ { proxy_pass http://127.0.0.1:8001; }
  location /sitemap.xml { proxy_pass http://127.0.0.1:8001; }
  location /robots.txt { proxy_pass http://127.0.0.1:8001; }
  location / { root /var/www/lioneyo/frontend/build; try_files $uri /index.html; }
}
```

## 6. HTTPS
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d lioneyo.com -d www.lioneyo.com
```

## 7. Google OAuth Redirect URIs
Add in Google Cloud Console → APIs → Credentials → OAuth Client:
- Authorized JavaScript origins: `https://lioneyo.com`
- Authorized redirect URIs: `https://lioneyo.com` (Google Identity Services uses popup flow)

## 8. Razorpay Webhook
Dashboard → Webhooks → Add: `https://lioneyo.com/api/orders/webhook` (when configured) with secret stored in Admin → Settings → Razorpay.

## 9. First Login
- Open `https://lioneyo.com/admin/login`
- Email: `admin@lioneyo.com` / Password: `Lioneyo@2026`
- **Change password immediately** (TODO: add change-password endpoint).
- Configure Cloudflare R2 keys, Google credentials, hero, logos.
