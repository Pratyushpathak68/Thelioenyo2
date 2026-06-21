"""THE LIONEYO — main FastAPI server."""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, UploadFile, File, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from typing import List, Optional
import os
import logging
import bcrypt
import jwt
import hmac
import hashlib
import time
import secrets
import shutil
import httpx
import razorpay

from models import (
    Product, ProductCreate, Collection, CollectionCreate,
    Order, OrderCreate, Coupon, CouponCreate, Review, ReviewCreate,
    Settings, LoginInput, gen_id, now_iso
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'lioneyo-dev-secret')
JWT_ALGO = "HS256"

app = FastAPI(title="THE LIONEYO API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
log = logging.getLogger("lioneyo")

UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def make_token(payload: dict) -> str:
    payload = {**payload, "iat": int(time.time()), "exp": int(time.time()) + 86400 * 7}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def require_admin(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        if data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Not admin")
        return data
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_settings_doc() -> dict:
    doc = await db.settings.find_one({"id": "global"}, {"_id": 0})
    if not doc:
        s = Settings()
        doc = s.model_dump()
        await db.settings.insert_one(doc)
    return doc


@api.post("/admin/login")
async def admin_login(body: LoginInput):
    user = await db.admins.find_one({"email": body.email.lower()}, {"_id": 0})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = make_token({"role": "admin", "email": user["email"]})
    return {"token": token, "email": user["email"]}


@api.get("/admin/me")
async def admin_me(admin=Depends(require_admin)):
    return {"email": admin["email"], "role": admin["role"]}


@api.get("/settings")
async def get_public_settings():
    s = await get_settings_doc()
    public_keys = {
        "logo_light", "logo_dark", "favicon",
        "announcement_messages", "announcement_enabled",
        "hero_heading", "hero_subheading", "hero_image", "hero_video", "hero_cta_text", "hero_cta_link",
        "shipping_fee", "free_shipping_threshold", "cod_enabled", "cod_advance", "cod_fee",
        "whatsapp_number",
        "site_title", "site_description", "site_keywords", "og_image",
        "instagram_url", "youtube_url", "footer_text",
        "privacy_policy", "terms", "refund_policy", "shipping_policy",
        "trust_badges", "low_stock_threshold",
        "razorpay_key_id", "google_client_id",
    }
    return {k: v for k, v in s.items() if k in public_keys}


@api.get("/admin/settings")
async def get_full_settings(admin=Depends(require_admin)):
    s = await get_settings_doc()
    s.pop("_id", None)
    return s


@api.put("/admin/settings")
async def update_settings(payload: dict, admin=Depends(require_admin)):
    payload.pop("id", None); payload.pop("_id", None)
    await db.settings.update_one({"id": "global"}, {"$set": payload}, upsert=True)
    return await get_settings_doc()


@api.get("/collections")
async def list_collections():
    return await db.collections.find({}, {"_id": 0}).sort("order", 1).to_list(200)


@api.get("/collections/{slug}")
async def get_collection(slug: str):
    doc = await db.collections.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    return doc


@api.post("/admin/collections")
async def create_collection(body: CollectionCreate, admin=Depends(require_admin)):
    if await db.collections.find_one({"slug": body.slug}):
        raise HTTPException(400, "Slug exists")
    c = Collection(**body.model_dump())
    await db.collections.insert_one(c.model_dump())
    return c.model_dump()


@api.put("/admin/collections/{cid}")
async def update_collection(cid: str, body: dict, admin=Depends(require_admin)):
    body.pop("id", None); body.pop("_id", None)
    await db.collections.update_one({"id": cid}, {"$set": body})
    return await db.collections.find_one({"id": cid}, {"_id": 0})


@api.delete("/admin/collections/{cid}")
async def delete_collection(cid: str, admin=Depends(require_admin)):
    await db.collections.delete_one({"id": cid})
    return {"ok": True}


@api.get("/products")
async def list_products(collection: Optional[str] = None, featured: Optional[bool] = None, limit: int = 100):
    q = {"is_hidden": False}
    if collection and collection != "all":
        q["collection_slug"] = collection
    if featured:
        q["is_featured"] = True
    docs = await db.products.find(q, {"_id": 0}).limit(limit).to_list(limit)
    return docs


@api.get("/products/{slug}")
async def get_product(slug: str):
    doc = await db.products.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    await db.products.update_one({"slug": slug}, {"$inc": {"views": 1}})
    return doc


@api.get("/products/{slug}/related")
async def related_products(slug: str):
    p = await db.products.find_one({"slug": slug}, {"_id": 0})
    if not p:
        return []
    q = {"slug": {"$ne": slug}, "is_hidden": False}
    if p.get("collection_slug"):
        q["collection_slug"] = p["collection_slug"]
    return await db.products.find(q, {"_id": 0}).limit(8).to_list(8)


@api.post("/admin/products")
async def create_product(body: ProductCreate, admin=Depends(require_admin)):
    if await db.products.find_one({"slug": body.slug}):
        raise HTTPException(400, "Slug exists")
    p = Product(**body.model_dump())
    await db.products.insert_one(p.model_dump())
    return p.model_dump()


@api.put("/admin/products/{pid}")
async def update_product(pid: str, body: dict, admin=Depends(require_admin)):
    body.pop("id", None); body.pop("_id", None)
    body["updated_at"] = now_iso()
    await db.products.update_one({"id": pid}, {"$set": body})
    return await db.products.find_one({"id": pid}, {"_id": 0})


@api.delete("/admin/products/{pid}")
async def delete_product(pid: str, admin=Depends(require_admin)):
    await db.products.delete_one({"id": pid})
    return {"ok": True}


@api.post("/admin/products/{pid}/duplicate")
async def duplicate_product(pid: str, admin=Depends(require_admin)):
    doc = await db.products.find_one({"id": pid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    doc["id"] = gen_id()
    doc["slug"] = f"{doc['slug']}-copy-{secrets.token_hex(3)}"
    doc["name"] = f"{doc['name']} (Copy)"
    doc["is_hidden"] = True
    doc["created_at"] = now_iso(); doc["updated_at"] = now_iso()
    await db.products.insert_one(doc)
    return doc


@api.get("/coupons/popup")
async def popup_coupon():
    return await db.coupons.find_one({"is_popup": True, "is_active": True}, {"_id": 0})


@api.post("/coupons/validate")
async def validate_coupon(payload: dict):
    code = (payload.get("code") or "").upper()
    subtotal = float(payload.get("subtotal", 0))
    c = await db.coupons.find_one({"code": code, "is_active": True}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Invalid coupon")
    if subtotal < c.get("min_order", 0):
        raise HTTPException(400, f"Minimum order \u20b9{c['min_order']}")
    if c.get("usage_limit", 0) > 0 and c.get("used_count", 0) >= c["usage_limit"]:
        raise HTTPException(400, "Coupon limit reached")
    discount = c["discount_value"] if c["discount_type"] == "flat" else (subtotal * c["discount_value"] / 100)
    if c.get("max_discount"):
        discount = min(discount, c["max_discount"])
    return {"code": code, "discount": round(discount, 2), "discount_type": c["discount_type"]}


@api.get("/admin/coupons")
async def admin_list_coupons(admin=Depends(require_admin)):
    return await db.coupons.find({}, {"_id": 0}).to_list(500)


@api.post("/admin/coupons")
async def admin_create_coupon(body: CouponCreate, admin=Depends(require_admin)):
    body.code = body.code.upper()
    if await db.coupons.find_one({"code": body.code}):
        raise HTTPException(400, "Code exists")
    c = Coupon(**body.model_dump())
    await db.coupons.insert_one(c.model_dump())
    return c.model_dump()


@api.put("/admin/coupons/{cid}")
async def admin_update_coupon(cid: str, body: dict, admin=Depends(require_admin)):
    body.pop("id", None); body.pop("_id", None)
    if "code" in body:
        body["code"] = body["code"].upper()
    await db.coupons.update_one({"id": cid}, {"$set": body})
    return await db.coupons.find_one({"id": cid}, {"_id": 0})


@api.delete("/admin/coupons/{cid}")
async def admin_delete_coupon(cid: str, admin=Depends(require_admin)):
    await db.coupons.delete_one({"id": cid})
    return {"ok": True}


@api.get("/reviews/{product_id}")
async def list_reviews(product_id: str):
    return await db.reviews.find({"product_id": product_id, "is_approved": True}, {"_id": 0}).to_list(200)


@api.post("/reviews")
async def create_review(body: ReviewCreate):
    r = Review(**body.model_dump())
    if await db.orders.find_one({"user_email": body.user_email}):
        r.verified_buyer = True
    await db.reviews.insert_one(r.model_dump())
    return r.model_dump()


@api.get("/admin/reviews")
async def admin_reviews(admin=Depends(require_admin)):
    return await db.reviews.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.put("/admin/reviews/{rid}")
async def admin_update_review(rid: str, body: dict, admin=Depends(require_admin)):
    body.pop("id", None); body.pop("_id", None)
    await db.reviews.update_one({"id": rid}, {"$set": body})
    return await db.reviews.find_one({"id": rid}, {"_id": 0})


@api.delete("/admin/reviews/{rid}")
async def admin_delete_review(rid: str, admin=Depends(require_admin)):
    await db.reviews.delete_one({"id": rid})
    return {"ok": True}


def _rzp_client(settings: dict):
    kid = settings.get("razorpay_key_id") or os.environ.get("RAZORPAY_KEY_ID")
    sec = settings.get("razorpay_key_secret") or os.environ.get("RAZORPAY_KEY_SECRET")
    if not kid or not sec:
        raise HTTPException(500, "Razorpay not configured")
    return razorpay.Client(auth=(kid, sec)), kid


def _gen_order_number() -> str:
    return f"LE{int(time.time())}{secrets.token_hex(2).upper()}"


@api.post("/orders/create")
async def create_order(body: OrderCreate):
    settings = await get_settings_doc()
    order_number = _gen_order_number()

    if body.payment_method == "partial_cod":
        payable_now = float(settings.get("cod_advance", 150))
        amount_due = body.total - payable_now
    else:
        payable_now = body.total
        amount_due = 0

    order = Order(
        order_number=order_number,
        items=body.items,
        subtotal=body.subtotal, discount=body.discount,
        shipping=body.shipping, cod_fee=body.cod_fee,
        total=body.total, amount_paid=0, amount_due=amount_due,
        payment_method=body.payment_method, coupon_code=body.coupon_code,
        shipping_address=body.shipping_address,
        user_email=body.user_email or body.shipping_address.email,
    )

    try:
        rzp, kid = _rzp_client(settings)
        rzp_order = rzp.order.create({
            "amount": int(round(payable_now * 100)),
            "currency": "INR",
            "receipt": order_number[:40],
            "payment_capture": 1,
            "notes": {"order_number": order_number},
        })
        order.razorpay_order_id = rzp_order["id"]
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Razorpay error: {e}")
        raise HTTPException(500, "Payment provider error")

    await db.orders.insert_one(order.model_dump())

    return {
        "order": order.model_dump(),
        "razorpay": {
            "key_id": settings.get("razorpay_key_id") or os.environ.get("RAZORPAY_KEY_ID"),
            "order_id": rzp_order["id"],
            "amount": rzp_order["amount"],
            "currency": rzp_order["currency"],
        },
        "payable_now": payable_now,
        "amount_due": amount_due,
    }


@api.post("/orders/verify")
async def verify_payment(payload: dict):
    settings = await get_settings_doc()
    order_id = payload.get("razorpay_order_id")
    pay_id = payload.get("razorpay_payment_id")
    sig = payload.get("razorpay_signature")
    secret = settings.get("razorpay_key_secret") or os.environ.get("RAZORPAY_KEY_SECRET")
    if not (order_id and pay_id and sig and secret):
        raise HTTPException(400, "Missing fields")
    digest = hmac.new(secret.encode(), f"{order_id}|{pay_id}".encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(digest, sig):
        raise HTTPException(400, "Invalid signature")

    order = await db.orders.find_one({"razorpay_order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")

    if order["payment_method"] == "partial_cod":
        paid = float(settings.get("cod_advance", 150))
        status = "partial"
    else:
        paid = order["total"]
        status = "paid"

    update = {
        "razorpay_payment_id": pay_id,
        "amount_paid": paid,
        "amount_due": order["total"] - paid,
        "payment_status": status,
        "status": "processing",
        "updated_at": now_iso(),
    }
    await db.orders.update_one({"id": order["id"]}, {"$set": update})

    for item in order["items"]:
        await db.products.update_one(
            {"id": item["product_id"], "sizes.size": item["size"]},
            {"$inc": {"sizes.$.stock": -item["qty"], "sold_count": item["qty"]}}
        )

    if order.get("coupon_code"):
        await db.coupons.update_one({"code": order["coupon_code"]}, {"$inc": {"used_count": 1}})

    hook = settings.get("google_sheets_webhook")
    if hook:
        try:
            async with httpx.AsyncClient(timeout=5) as c:
                await c.post(hook, json={**order, **update})
        except Exception as e:
            log.warning(f"Sheets sync failed: {e}")

    return {"ok": True, "order_number": order["order_number"]}


@api.get("/orders/track/{order_number}")
async def track_order(order_number: str):
    doc = await db.orders.find_one({"order_number": order_number.upper()}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Order not found")
    return doc


@api.get("/admin/orders")
async def admin_orders(admin=Depends(require_admin)):
    return await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.put("/admin/orders/{oid}")
async def admin_update_order(oid: str, body: dict, admin=Depends(require_admin)):
    body.pop("id", None); body.pop("_id", None)
    body["updated_at"] = now_iso()
    await db.orders.update_one({"id": oid}, {"$set": body})
    return await db.orders.find_one({"id": oid}, {"_id": 0})


@api.get("/wishlist")
async def get_wishlist(email: str):
    docs = await db.wishlist.find({"email": email}, {"_id": 0}).to_list(500)
    return [d["product_id"] for d in docs]


@api.post("/wishlist/toggle")
async def toggle_wishlist(payload: dict):
    email = payload.get("email")
    pid = payload.get("product_id")
    if not (email and pid):
        raise HTTPException(400, "email + product_id required")
    existing = await db.wishlist.find_one({"email": email, "product_id": pid})
    if existing:
        await db.wishlist.delete_one({"email": email, "product_id": pid})
        return {"action": "removed"}
    await db.wishlist.insert_one({"email": email, "product_id": pid, "created_at": now_iso()})
    return {"action": "added"}


@api.post("/admin/upload")
async def upload_file(file: UploadFile = File(...), admin=Depends(require_admin)):
    settings = await get_settings_doc()
    ext = Path(file.filename or "img.bin").suffix or ".bin"
    name = f"{gen_id()}{ext}"
    target = UPLOAD_DIR / name
    with target.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    if all(settings.get(k) for k in ["r2_access_key", "r2_secret_key", "r2_bucket", "r2_account_id", "r2_public_url"]):
        try:
            import boto3
            s3 = boto3.client(
                "s3",
                endpoint_url=f"https://{settings['r2_account_id']}.r2.cloudflarestorage.com",
                aws_access_key_id=settings["r2_access_key"],
                aws_secret_access_key=settings["r2_secret_key"],
                region_name="auto",
            )
            with target.open("rb") as f:
                s3.upload_fileobj(f, settings["r2_bucket"], name, ExtraArgs={"ContentType": file.content_type or "application/octet-stream"})
            public_url = settings["r2_public_url"].rstrip("/") + "/" + name
            target.unlink(missing_ok=True)
            return {"url": public_url}
        except Exception as e:
            log.warning(f"R2 upload failed, falling back to local: {e}")

    return {"url": f"/uploads/{name}", "name": name}


@api.get("/admin/analytics")
async def analytics(admin=Depends(require_admin)):
    total_orders = await db.orders.count_documents({})
    paid_orders = await db.orders.count_documents({"payment_status": {"$in": ["paid", "partial"]}})
    revenue_pipeline = [{"$match": {"payment_status": {"$in": ["paid", "partial"]}}},
                        {"$group": {"_id": None, "rev": {"$sum": "$amount_paid"}}}]
    rev_doc = await db.orders.aggregate(revenue_pipeline).to_list(1)
    revenue = rev_doc[0]["rev"] if rev_doc else 0

    top_viewed = await db.products.find({}, {"_id": 0, "name": 1, "slug": 1, "views": 1, "images": 1}).sort("views", -1).limit(8).to_list(8)
    top_sold = await db.products.find({}, {"_id": 0, "name": 1, "slug": 1, "sold_count": 1, "images": 1}).sort("sold_count", -1).limit(8).to_list(8)
    total_products = await db.products.count_documents({})
    total_customers = len(await db.orders.distinct("user_email"))

    return {
        "total_orders": total_orders, "paid_orders": paid_orders, "revenue": revenue,
        "total_products": total_products, "total_customers": total_customers,
        "top_viewed": top_viewed, "top_sold": top_sold,
    }


@app.get("/sitemap.xml")
async def sitemap():
    base = os.environ.get("PUBLIC_SITE_URL", "https://lioneyo.com").rstrip("/")
    products = await db.products.find({"is_hidden": False}, {"_id": 0, "slug": 1}).to_list(2000)
    collections = await db.collections.find({}, {"_id": 0, "slug": 1}).to_list(200)
    urls = [f"{base}/", f"{base}/collection/all"]
    urls += [f"{base}/collection/{c['slug']}" for c in collections]
    urls += [f"{base}/product/{p['slug']}" for p in products]
    body = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    for u in urls:
        body += f"  <url><loc>{u}</loc></url>\n"
    body += "</urlset>"
    return Response(content=body, media_type="application/xml")


@app.get("/robots.txt")
async def robots_txt():
    base = os.environ.get("PUBLIC_SITE_URL", "https://lioneyo.com").rstrip("/")
    return Response(content=f"User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: {base}/sitemap.xml\n", media_type="text/plain")


@api.get("/")
async def root():
    return {"name": "THE LIONEYO API", "version": "1.0"}


# ===================== Google OAuth (standard) =====================
@api.post("/auth/google")
async def google_auth(payload: dict):
    """Exchange Google ID token for our app session.
    Frontend uses Google Identity Services (One Tap / button) to obtain a credential (JWT id_token).
    We verify it with Google's tokeninfo endpoint and create/find a user.
    """
    id_token = payload.get("credential") or payload.get("id_token")
    if not id_token:
        raise HTTPException(400, "Missing credential")
    settings = await get_settings_doc()
    expected_client = settings.get("google_client_id") or os.environ.get("GOOGLE_CLIENT_ID")
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            resp = await c.get("https://oauth2.googleapis.com/tokeninfo", params={"id_token": id_token})
            resp.raise_for_status()
            info = resp.json()
    except Exception as e:
        log.error(f"Google verify failed: {e}")
        raise HTTPException(401, "Invalid Google token")

    if expected_client and info.get("aud") != expected_client:
        raise HTTPException(401, "Token audience mismatch")

    email = (info.get("email") or "").lower()
    name = info.get("name") or email.split("@")[0]
    google_id = info.get("sub")
    if not email or not google_id:
        raise HTTPException(400, "Insufficient profile")

    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        # Store ONLY name, email, google_id (no photo, no tokens)
        user = {
            "id": gen_id(), "email": email, "name": name,
            "google_id": google_id, "referral_code": f"LE{secrets.token_hex(3).upper()}",
            "created_at": now_iso(),
        }
        await db.users.insert_one(user)
        user.pop("_id", None)

    token = make_token({"role": "customer", "email": email, "name": name})
    return {"token": token, "user": {"email": email, "name": name, "referral_code": user.get("referral_code")}}


@api.get("/auth/me")
async def auth_me(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        return {"user": None}
    try:
        data = jwt.decode(authorization.split(" ", 1)[1], JWT_SECRET, algorithms=[JWT_ALGO])
        user = await db.users.find_one({"email": data.get("email")}, {"_id": 0, "google_id": 0})
        return {"user": user}
    except Exception:
        return {"user": None}


@app.on_event("startup")
async def startup():
    admin_email = "admin@lioneyo.com"
    admin_pw = "Lioneyo@2026"
    if not await db.admins.find_one({"email": admin_email}):
        await db.admins.insert_one({
            "id": gen_id(), "email": admin_email,
            "password_hash": hash_password(admin_pw),
            "created_at": now_iso(),
        })
        log.info(f"Seeded admin: {admin_email}")

    if not await db.settings.find_one({"id": "global"}):
        s = Settings()
        s.razorpay_key_id = os.environ.get("RAZORPAY_KEY_ID")
        s.razorpay_key_secret = os.environ.get("RAZORPAY_KEY_SECRET")
        s.google_sheets_webhook = os.environ.get("GOOGLE_SHEETS_WEBHOOK")
        s.r2_account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
        s.r2_endpoint = os.environ.get("CLOUDFLARE_R2_ENDPOINT")
        s.r2_bucket = "lioneyo-media"
        s.announcement_messages = [
            "\u2726 500+ Happy Customers",
            "\u2726 Free Shipping Above \u20b92999",
            "\u2726 Anime Collection Live Now",
            "\u2726 New Drops Every Week",
        ]
        s.hero_image = "https://images.pexels.com/photos/10469630/pexels-photo-10469630.jpeg"
        await db.settings.insert_one(s.model_dump())
        log.info("Seeded settings")

    if await db.products.count_documents({}) == 0:
        from seed import seed_data
        await seed_data(db)
        log.info("Seeded products + collections + coupons")


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"], allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    client.close()
