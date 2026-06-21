"""THE LIONEYO backend regression tests."""
import os, time, hmac, hashlib, requests, pytest

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://lion-ecommerce.preview.emergentagent.com").rstrip("/")
# Load frontend env for BASE
try:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL"):
                BASE = line.split("=", 1)[1].strip().rstrip("/")
except Exception:
    pass

API = f"{BASE}/api"
ADMIN_EMAIL = "admin@lioneyo.com"
ADMIN_PW = "Lioneyo@2026"


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- PUBLIC ----------
def test_root():
    r = requests.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert "LIONEYO" in d["name"] and d["version"]


def test_public_settings_no_secrets():
    r = requests.get(f"{API}/settings", timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert "hero_heading" in d and "shipping_fee" in d and "razorpay_key_id" in d
    for k in ("razorpay_key_secret", "r2_secret_key", "google_client_secret", "password_hash"):
        assert k not in d


def test_collections_seeded():
    r = requests.get(f"{API}/collections", timeout=15)
    assert r.status_code == 200
    slugs = {c["slug"] for c in r.json()}
    assert {"anime", "streetwear", "essentials"}.issubset(slugs)


def test_products_seeded_and_filters():
    r = requests.get(f"{API}/products", timeout=15)
    assert r.status_code == 200
    all_p = r.json()
    assert len(all_p) >= 8
    r2 = requests.get(f"{API}/products?collection=anime", timeout=15).json()
    assert r2 and all(p["collection_slug"] == "anime" for p in r2)
    r3 = requests.get(f"{API}/products?featured=true", timeout=15).json()
    assert isinstance(r3, list)


def test_product_detail_views_increment():
    r1 = requests.get(f"{API}/products/kaizen-black", timeout=15)
    assert r1.status_code == 200
    v1 = r1.json().get("views", 0)
    r2 = requests.get(f"{API}/products/kaizen-black", timeout=15)
    v2 = r2.json().get("views", 0)
    assert v2 == v1 + 1


def test_related_products():
    r = requests.get(f"{API}/products/kaizen-black/related", timeout=15)
    assert r.status_code == 200 and isinstance(r.json(), list)


def test_popup_coupon():
    r = requests.get(f"{API}/coupons/popup", timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d and d["code"] == "WELCOME150"


def test_coupon_validate_ok():
    r = requests.post(f"{API}/coupons/validate", json={"code": "WELCOME150", "subtotal": 1500}, timeout=15)
    assert r.status_code == 200
    assert r.json()["discount"] == 150


def test_coupon_invalid_code():
    r = requests.post(f"{API}/coupons/validate", json={"code": "NOPE", "subtotal": 1500}, timeout=15)
    assert r.status_code == 404


def test_coupon_below_min():
    r = requests.post(f"{API}/coupons/validate", json={"code": "WELCOME150", "subtotal": 500}, timeout=15)
    assert r.status_code == 400


# ---------- ADMIN AUTH ----------
def test_admin_login_wrong():
    r = requests.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=15)
    assert r.status_code == 401


def test_admin_me(auth):
    r = requests.get(f"{API}/admin/me", headers=auth, timeout=15)
    assert r.status_code == 200
    assert r.json()["email"] == ADMIN_EMAIL


def test_admin_me_no_token():
    r = requests.get(f"{API}/admin/me", timeout=15)
    assert r.status_code == 401


# ---------- ADMIN PRODUCT CRUD ----------
def test_admin_product_crud(auth):
    slug = f"test-prod-{int(time.time())}"
    body = {"slug": slug, "name": "TEST_Product", "price": 999, "compare_price": 1499,
            "collection_slug": "anime", "images": ["https://x/y.jpg"], "sizes": [{"size": "M", "stock": 5}],
            "description": "t", "is_featured": False, "is_hidden": False}
    r = requests.post(f"{API}/admin/products", json=body, headers=auth, timeout=15)
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    # update
    r2 = requests.put(f"{API}/admin/products/{pid}", json={"price": 1099}, headers=auth, timeout=15)
    assert r2.status_code == 200 and r2.json()["price"] == 1099
    # duplicate
    r3 = requests.post(f"{API}/admin/products/{pid}/duplicate", headers=auth, timeout=15)
    assert r3.status_code == 200 and r3.json()["slug"] != slug
    dup_id = r3.json()["id"]
    # delete
    assert requests.delete(f"{API}/admin/products/{pid}", headers=auth, timeout=15).status_code == 200
    assert requests.delete(f"{API}/admin/products/{dup_id}", headers=auth, timeout=15).status_code == 200


# ---------- ADMIN COLLECTIONS ----------
def test_admin_collections_crud(auth):
    slug = f"test-col-{int(time.time())}"
    r = requests.post(f"{API}/admin/collections",
                      json={"slug": slug, "name": "TEST_Col", "order": 99},
                      headers=auth, timeout=15)
    assert r.status_code == 200, r.text
    cid = r.json()["id"]
    r2 = requests.put(f"{API}/admin/collections/{cid}", json={"name": "TEST_Col2"}, headers=auth, timeout=15)
    assert r2.status_code == 200 and r2.json()["name"] == "TEST_Col2"
    assert requests.delete(f"{API}/admin/collections/{cid}", headers=auth, timeout=15).status_code == 200


# ---------- ADMIN COUPONS ----------
def test_admin_coupons_crud(auth):
    code = f"TEST{int(time.time())}"
    r = requests.post(f"{API}/admin/coupons",
                      json={"code": code, "discount_type": "flat", "discount_value": 100, "min_order": 500,
                            "is_active": True, "is_popup": False},
                      headers=auth, timeout=15)
    assert r.status_code == 200, r.text
    cid = r.json()["id"]
    r2 = requests.put(f"{API}/admin/coupons/{cid}", json={"discount_value": 120}, headers=auth, timeout=15)
    assert r2.status_code == 200 and r2.json()["discount_value"] == 120
    assert requests.delete(f"{API}/admin/coupons/{cid}", headers=auth, timeout=15).status_code == 200


# ---------- ADMIN SETTINGS ----------
def test_admin_settings_get_and_put(auth):
    r = requests.get(f"{API}/admin/settings", headers=auth, timeout=15)
    assert r.status_code == 200
    original_fee = r.json().get("shipping_fee")
    new_fee = (original_fee or 0) + 1
    r2 = requests.put(f"{API}/admin/settings",
                      json={"shipping_fee": new_fee, "hero_heading": "TEST_HERO"},
                      headers=auth, timeout=15)
    assert r2.status_code == 200
    assert r2.json()["shipping_fee"] == new_fee and r2.json()["hero_heading"] == "TEST_HERO"
    # restore
    requests.put(f"{API}/admin/settings", json={"shipping_fee": original_fee}, headers=auth, timeout=15)


# ---------- ANALYTICS ----------
def test_admin_analytics(auth):
    r = requests.get(f"{API}/admin/analytics", headers=auth, timeout=15)
    assert r.status_code == 200
    d = r.json()
    for k in ("total_orders", "revenue", "top_viewed", "top_sold"):
        assert k in d


# ---------- ORDERS ----------
def _order_payload(payment_method="prepaid"):
    return {
        "items": [{"product_id": "p1", "product_slug": "kaizen-black", "name": "Kaizen",
                   "image": "x", "size": "M", "qty": 1, "price": 1499}],
        "subtotal": 1499, "discount": 0, "shipping": 0, "cod_fee": 0, "total": 1499,
        "payment_method": payment_method, "coupon_code": None,
        "shipping_address": {"full_name": "TEST", "phone": "9999999999", "email": "test@example.com",
                             "line1": "1", "city": "Mumbai", "state": "MH", "pincode": "400001", "country": "India"},
        "user_email": "test@example.com",
    }


def test_create_order_prepaid():
    r = requests.post(f"{API}/orders/create", json=_order_payload("prepaid"), timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["razorpay"]["order_id"].startswith("order_")
    assert d["razorpay"]["key_id"] and d["payable_now"] == 1499


def test_create_order_partial_cod():
    r = requests.post(f"{API}/orders/create", json=_order_payload("partial_cod"), timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["payable_now"] == 150
    assert d["amount_due"] == 1499 - 150


def test_verify_invalid_signature():
    r = requests.post(f"{API}/orders/verify",
                      json={"razorpay_order_id": "order_x", "razorpay_payment_id": "pay_x",
                            "razorpay_signature": "bad"},
                      timeout=15)
    assert r.status_code == 400


def test_track_order_after_create():
    r = requests.post(f"{API}/orders/create", json=_order_payload("prepaid"), timeout=30)
    order_number = r.json()["order"]["order_number"]
    r2 = requests.get(f"{API}/orders/track/{order_number}", timeout=15)
    assert r2.status_code == 200
    assert r2.json()["order_number"] == order_number


def test_track_order_404():
    r = requests.get(f"{API}/orders/track/LE_NONEXISTENT_999", timeout=15)
    assert r.status_code == 404


# ---------- GOOGLE OAUTH ----------
def test_google_auth_invalid():
    r = requests.post(f"{API}/auth/google", json={"credential": "not-a-real-token"}, timeout=15)
    assert r.status_code == 401


# ---------- SEO ----------
def test_sitemap():
    r = requests.get(f"{BASE}/sitemap.xml", timeout=15)
    assert r.status_code == 200
    assert "<urlset" in r.text and "kaizen-black" in r.text


def test_robots():
    r = requests.get(f"{BASE}/robots.txt", timeout=15)
    assert r.status_code == 200 and "User-agent" in r.text


# ---------- WISHLIST ----------
def test_wishlist_toggle():
    email = f"TEST_wl_{int(time.time())}@example.com"
    pid = "wl-test-id"
    r1 = requests.post(f"{API}/wishlist/toggle", json={"email": email, "product_id": pid}, timeout=15)
    assert r1.status_code == 200 and r1.json()["action"] == "added"
    r2 = requests.post(f"{API}/wishlist/toggle", json={"email": email, "product_id": pid}, timeout=15)
    assert r2.status_code == 200 and r2.json()["action"] == "removed"


# ---------- REVIEWS ----------
def test_review_create():
    r = requests.post(f"{API}/reviews",
                      json={"product_id": "p-test", "user_name": "TEST_user",
                            "user_email": "test_rev@example.com", "rating": 5, "text": "great"},
                      timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["rating"] == 5 and d.get("is_approved") in (False, None)
