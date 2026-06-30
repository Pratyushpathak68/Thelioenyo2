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
# Mount under /api/uploads so Kubernetes ingress routes it to backend.
# (Ingress only forwards /api/* to the backend; bare /uploads would hit the frontend and 404.)
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


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


@api.post("/admin/change-password")
async def admin_change_password(body: dict, admin=Depends(require_admin)):
    current = body.get("current_password")
    new = body.get("new_password")
    if not current or not new or len(new) < 8:
        raise HTTPException(400, "new_password must be at least 8 characters")
    user = await db.admins.find_one({"email": admin["email"]}, {"_id": 0})
    if not user or not verify_password(current, user["password_hash"]):
        raise HTTPException(401, "Current password incorrect")
    await db.admins.update_one(
        {"email": admin["email"]},
        {"$set": {"password_hash": hash_password(new), "updated_at": now_iso()}}
    )
    return {"ok": True}


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


@api.get("/admin/products")
async def admin_list_products(admin=Depends(require_admin), limit: int = 1000):
    """Admin sees ALL products including hidden + duplicated."""
    docs = await db.products.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
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
    # Validate slug — must be non-empty url-safe
    slug = (body.slug or "").strip().lower()
    if not slug:
        raise HTTPException(400, "Slug cannot be empty")
    import re
    if not re.match(r"^[a-z0-9][a-z0-9\-]*$", slug):
        raise HTTPException(400, "Slug must contain only lowercase letters, digits and hyphens")
    body.slug = slug
    if not (body.name or "").strip():
        raise HTTPException(400, "Name is required")
    if body.price is None or float(body.price) < 0:
        raise HTTPException(400, "Price must be a non-negative number")
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
    doc.pop("_id", None)
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


# ===================== Referral System =====================
@api.post("/referrals/validate")
async def validate_referral(payload: dict):
    code = (payload.get("code") or "").upper().strip()
    subtotal = float(payload.get("subtotal", 0))
    email = (payload.get("email") or "").lower().strip()
    if not code:
        raise HTTPException(400, "Code required")
    settings = await get_settings_doc()
    if not settings.get("referral_enabled", True):
        raise HTTPException(400, "Referrals disabled")
    if subtotal < float(settings.get("referral_min_order", 0)):
        raise HTTPException(400, f"Minimum order \u20b9{settings.get('referral_min_order', 0)}")
    referrer = await db.users.find_one({"referral_code": code}, {"_id": 0})
    if not referrer:
        raise HTTPException(404, "Invalid referral code")
    if email and referrer.get("email", "").lower() == email:
        raise HTTPException(400, "Cannot use your own referral code")
    d_type = settings.get("referral_discount_type", "percent")
    d_val = float(settings.get("referral_discount_value", 10))
    discount = d_val if d_type == "flat" else (subtotal * d_val / 100)
    max_d = settings.get("referral_max_discount")
    if max_d:
        discount = min(discount, float(max_d))
    return {
        "code": code,
        "discount": round(discount, 2),
        "discount_type": d_type,
        "referrer_email": referrer.get("email"),
    }


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


# ===================== WhatsApp helper =====================
def _normalize_phone(raw: str) -> str:
    """Normalize Indian phone to E.164 (without leading +) for WA Cloud API."""
    s = "".join(ch for ch in (raw or "") if ch.isdigit())
    if not s:
        return ""
    if len(s) == 10:
        return "91" + s
    if s.startswith("0") and len(s) == 11:
        return "91" + s[1:]
    if s.startswith("91") and len(s) == 12:
        return s
    return s


async def _send_whatsapp(phone: str, message: str) -> dict:
    """Send WhatsApp message via Meta Cloud API or gateway URL.

    Priority:
      1. Meta WA Cloud API (whatsapp_access_token + whatsapp_phone_id)
      2. Generic gateway POST (whatsapp_gateway_url)
      3. Skip silently (returns {"ok": False, "skipped": True})
    """
    if not phone or not message:
        return {"ok": False, "skipped": True, "reason": "no_phone_or_message"}
    settings = await get_settings_doc()
    to = _normalize_phone(phone)
    if not to:
        return {"ok": False, "skipped": True, "reason": "bad_phone"}

    token = settings.get("whatsapp_access_token")
    phone_id = settings.get("whatsapp_phone_id")
    if token and phone_id:
        try:
            async with httpx.AsyncClient(timeout=10) as c:
                resp = await c.post(
                    f"https://graph.facebook.com/v20.0/{phone_id}/messages",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "messaging_product": "whatsapp",
                        "to": to,
                        "type": "text",
                        "text": {"body": message},
                    },
                )
            if resp.status_code in (200, 201):
                return {"ok": True, "provider": "meta", "response": resp.json()}
            log.warning(f"WA Meta send failed {resp.status_code}: {resp.text[:300]}")
        except Exception as e:
            log.warning(f"WA Meta exception: {e}")

    gateway = settings.get("whatsapp_gateway_url")
    if gateway:
        try:
            async with httpx.AsyncClient(timeout=10) as c:
                resp = await c.post(gateway, json={"phone": to, "message": message})
            return {"ok": resp.status_code < 400, "provider": "gateway", "status": resp.status_code}
        except Exception as e:
            log.warning(f"WA gateway exception: {e}")

    return {"ok": False, "skipped": True, "reason": "not_configured"}


def _wa_template(template: str, order: dict, extra: dict | None = None) -> str:
    """Replace {order}, {tracking}, {due}, {name} placeholders."""
    data = {
        "order": order.get("order_number", ""),
        "tracking": order.get("tracking_number") or "—",
        "due": str(order.get("amount_due", 0)),
        "name": (order.get("shipping_address") or {}).get("full_name", ""),
    }
    if extra:
        data.update(extra)
    out = template or ""
    for k, v in data.items():
        out = out.replace("{" + k + "}", str(v))
    return out


async def _notify_whatsapp(order: dict, event: str) -> None:
    """Fire-and-forget WhatsApp notification for an order event.

    event: 'placed' | 'shipped' | 'delivered' | 'cod_reminder'
    Idempotent: tracks already-sent events in order.wa_notified.
    """
    if not order:
        return
    already = set(order.get("wa_notified") or [])
    if event in already:
        return
    settings = await get_settings_doc()
    template_key = {
        "placed": "whatsapp_order_template",
        "shipped": "whatsapp_shipped_template",
        "delivered": "whatsapp_delivered_template",
        "cod_reminder": "whatsapp_cod_reminder_template",
    }.get(event)
    if not template_key:
        return
    msg = _wa_template(settings.get(template_key, ""), order)
    phone = (order.get("shipping_address") or {}).get("phone")
    result = await _send_whatsapp(phone, msg)
    if result.get("ok"):
        await db.orders.update_one(
            {"id": order["id"]},
            {"$addToSet": {"wa_notified": event}, "$set": {"updated_at": now_iso()}}
        )


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
        referral_code=body.referral_code, referral_discount=body.referral_discount,
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

    if order.get("referral_code"):
        await db.referral_uses.insert_one({
            "id": gen_id(),
            "referral_code": order["referral_code"],
            "order_id": order["id"],
            "order_number": order["order_number"],
            "referee_email": order.get("user_email"),
            "discount": order.get("referral_discount", 0),
            "created_at": now_iso(),
        })
        await db.users.update_one(
            {"referral_code": order["referral_code"]},
            {"$inc": {"referral_count": 1, "referral_earnings": float(order.get("referral_discount", 0))}}
        )

    hook = settings.get("google_sheets_webhook")
    if hook:
        try:
            async with httpx.AsyncClient(timeout=5) as c:
                await c.post(hook, json={**order, **update})
        except Exception as e:
            log.warning(f"Sheets sync failed: {e}")

    # Fire WhatsApp order placed
    refreshed = await db.orders.find_one({"id": order["id"]}, {"_id": 0})
    try:
        await _notify_whatsapp(refreshed, "placed")
        if refreshed.get("payment_method") == "partial_cod":
            await _notify_whatsapp(refreshed, "cod_reminder")
    except Exception as e:
        log.warning(f"WA notify failed: {e}")

    return {"ok": True, "order_number": order["order_number"]}


# ===================== Razorpay Webhook =====================
@api.post("/razorpay/webhook")
async def razorpay_webhook(request: Request):
    """Razorpay event webhook. Configure in Razorpay dashboard:
    URL: {PUBLIC_BACKEND_URL}/api/razorpay/webhook
    Events: payment.captured, payment.failed, order.paid
    Set the same secret in admin settings -> razorpay_webhook_secret.
    """
    body = await request.body()
    signature = request.headers.get("x-razorpay-signature") or ""
    settings = await get_settings_doc()
    secret = settings.get("razorpay_webhook_secret") or os.environ.get("RAZORPAY_WEBHOOK_SECRET")
    if not secret:
        raise HTTPException(500, "Webhook secret not configured")
    digest = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(digest, signature):
        log.warning("Razorpay webhook signature mismatch")
        raise HTTPException(400, "Invalid signature")

    try:
        import json as _json
        evt = _json.loads(body.decode())
    except Exception:
        raise HTTPException(400, "Bad JSON")

    event = evt.get("event", "")
    payload = evt.get("payload", {})
    payment = (payload.get("payment") or {}).get("entity") or {}
    rzp_order_id = payment.get("order_id")
    if not rzp_order_id:
        return {"ok": True, "ignored": True}

    order = await db.orders.find_one({"razorpay_order_id": rzp_order_id}, {"_id": 0})
    if not order:
        log.info(f"Webhook for unknown order {rzp_order_id}")
        return {"ok": True, "unknown": True}

    update: dict = {"updated_at": now_iso()}
    if event in ("payment.captured", "order.paid"):
        if order["payment_method"] == "partial_cod":
            paid = float(settings.get("cod_advance", 150))
            update["payment_status"] = "partial"
        else:
            paid = order["total"]
            update["payment_status"] = "paid"
        update["razorpay_payment_id"] = payment.get("id")
        update["amount_paid"] = paid
        update["amount_due"] = order["total"] - paid
        if order.get("status") == "placed":
            update["status"] = "processing"
    elif event == "payment.failed":
        update["payment_status"] = "failed"

    await db.orders.update_one({"id": order["id"]}, {"$set": update})

    if update.get("payment_status") in ("paid", "partial"):
        refreshed = await db.orders.find_one({"id": order["id"]}, {"_id": 0})
        try:
            await _notify_whatsapp(refreshed, "placed")
            if refreshed.get("payment_method") == "partial_cod":
                await _notify_whatsapp(refreshed, "cod_reminder")
        except Exception as e:
            log.warning(f"WA notify (webhook) failed: {e}")

    return {"ok": True, "event": event}


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
    refreshed = await db.orders.find_one({"id": oid}, {"_id": 0})
    # Auto WA on status transitions
    new_status = body.get("status")
    if new_status in ("shipped", "delivered") and refreshed:
        try:
            await _notify_whatsapp(refreshed, new_status)
        except Exception as e:
            log.warning(f"WA notify on status {new_status} failed: {e}")
    return refreshed


@api.post("/admin/orders/{oid}/notify-whatsapp")
async def admin_resend_whatsapp(oid: str, payload: dict, admin=Depends(require_admin)):
    """Manually trigger a WhatsApp message for an order. body: {event: 'placed'|'shipped'|'delivered'|'cod_reminder', force: bool}"""
    event = payload.get("event", "placed")
    force = bool(payload.get("force", True))
    order = await db.orders.find_one({"id": oid}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")
    if force:
        await db.orders.update_one({"id": oid}, {"$pull": {"wa_notified": event}})
        order = await db.orders.find_one({"id": oid}, {"_id": 0})
    await _notify_whatsapp(order, event)
    return {"ok": True}


@api.get("/admin/referrals")
async def admin_referrals(admin=Depends(require_admin)):
    uses = await db.referral_uses.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    # Aggregate stats per referral code
    stats: dict = {}
    for u in uses:
        c = u.get("referral_code") or "?"
        s = stats.setdefault(c, {"code": c, "uses": 0, "total_discount": 0.0})
        s["uses"] += 1
        s["total_discount"] += float(u.get("discount", 0))
    return {"uses": uses, "stats": list(stats.values())}


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

    return {"url": f"/api/uploads/{name}", "name": name}


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

    # Referral stats
    ref_pipeline = [
        {"$group": {"_id": "$referral_code", "uses": {"$sum": 1}, "total_discount": {"$sum": "$discount"}}},
        {"$sort": {"uses": -1}}, {"$limit": 10},
    ]
    top_referrers = await db.referral_uses.aggregate(ref_pipeline).to_list(10)
    total_ref_uses = await db.referral_uses.count_documents({})

    return {
        "total_orders": total_orders, "paid_orders": paid_orders, "revenue": revenue,
        "total_products": total_products, "total_customers": total_customers,
        "top_viewed": top_viewed, "top_sold": top_sold,
        "top_referrers": [{"code": r["_id"], "uses": r["uses"], "total_discount": r["total_discount"]} for r in top_referrers if r.get("_id")],
        "total_referral_uses": total_ref_uses,
    }


@app.get("/sitemap.xml")
async def sitemap_root():
    return await _sitemap()


@api.get("/sitemap.xml")
async def sitemap_api():
    return await _sitemap()


async def _sitemap():
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
async def robots_root():
    return await _robots()


@api.get("/robots.txt")
async def robots_api():
    return await _robots()


async def _robots():
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


@api.get("/auth/orders")
async def auth_my_orders(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Unauthorized")
    try:
        data = jwt.decode(authorization.split(" ", 1)[1], JWT_SECRET, algorithms=[JWT_ALGO])
    except Exception:
        raise HTTPException(401, "Invalid token")
    docs = await db.orders.find({"user_email": data.get("email")}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs


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
        s.r2_public_url = "https://pub-c83a963739cb4b18b24a5ed3736bc7e9.r2.dev"
        s.hero_heading = "IGNITE YOUR STYLE"
        s.hero_subheading = "Premium streetwear engineered for those who move differently. Heavyweight fabrics. Limited drops."
        s.hero_image = "https://images.unsplash.com/photo-1542838686-37da4a9fd1b3?w=1920&q=80"
        s.announcement_messages = [
            "\u2726 500+ Happy Customers",
            "\u2726 Free Shipping Above \u20b92999",
            "\u2726 Anime Collection Live Now",
            "\u2726 New Drops Every Week",
        ]
        s.hero_image = "https://images.pexels.com/photos/10469630/pexels-photo-10469630.jpeg"
        await db.settings.insert_one(s.model_dump())
        log.info("Seeded settings")
    else:
        # Backfill new settings fields on existing installations
        defaults = Settings().model_dump()
        existing = await db.settings.find_one({"id": "global"}, {"_id": 0})
        missing = {k: v for k, v in defaults.items() if k not in existing}
        if missing:
            await db.settings.update_one({"id": "global"}, {"$set": missing})
            log.info(f"Backfilled settings keys: {list(missing.keys())}")

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
