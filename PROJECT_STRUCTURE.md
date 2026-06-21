# Project Structure

```
/app
├── backend/
│   ├── server.py            # FastAPI app + all routes
│   ├── models.py            # Pydantic models
│   ├── seed.py              # Initial data seed
│   ├── requirements.txt
│   ├── .env                 # MONGO_URL, RAZORPAY_*, GOOGLE_*, etc.
│   └── uploads/             # Local fallback uploads (when R2 not configured)
│
├── frontend/
│   └── src/
│       ├── App.js                       # Root router
│       ├── index.css                    # Design system + Tailwind
│       ├── services/api.js              # Axios instance + auth interceptors
│       ├── contexts/StoreContext.jsx    # Cart, wishlist, theme, user
│       ├── utils/format.js              # formatINR, resolveAsset, cn
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Header.jsx
│       │   │   ├── Footer.jsx
│       │   │   └── AnnouncementBar.jsx
│       │   ├── CartDrawer.jsx
│       │   ├── CouponPopup.jsx
│       │   ├── ProductCard.jsx
│       │   └── ui/                      # shadcn components
│       ├── pages/
│       │   ├── Home.jsx
│       │   ├── Collection.jsx
│       │   ├── Product.jsx
│       │   ├── Checkout.jsx
│       │   ├── OrderTracking.jsx
│       │   └── OrderSuccess.jsx
│       └── admin/
│           ├── AdminLogin.jsx
│           ├── AdminApp.jsx             # Layout with sidebar
│           └── pages/
│               ├── Dashboard.jsx
│               ├── Products.jsx
│               ├── Collections.jsx
│               ├── Orders.jsx
│               ├── Coupons.jsx
│               ├── Reviews.jsx
│               └── Settings.jsx
│
└── docs/
    ├── README.md
    ├── PROJECT_STRUCTURE.md
    ├── DEPLOYMENT_GUIDE.md
    ├── ADMIN_GUIDE.md
    └── ENVIRONMENT_VARIABLES.md
```

## Architecture Principles
- Backend: All routes under `/api/*`. Admin routes under `/api/admin/*` require Bearer JWT.
- Frontend: Public storefront + isolated `/admin` shell. No shared chrome between them.
- Settings stored in Mongo (`settings` collection, `id="global"`) — fully admin editable.
- Media: local `/uploads/` fallback; auto-switches to Cloudflare R2 when configured.
- Auth: JWT (HS256) for admin & customer; tokens in `localStorage`.
