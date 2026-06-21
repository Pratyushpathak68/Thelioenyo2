"""Seed initial data for THE LIONEYO."""
from models import gen_id, now_iso


def _sizes(stocks=None):
    stocks = stocks or [8, 14, 18, 16, 10, 6]
    return [{"size": s, "stock": q} for s, q in zip(["XS","S","M","L","XL","XXL"], stocks)]


async def seed_data(db):
    collections = [
        {
            "id": gen_id(), "slug": "anime", "name": "Anime",
            "description": "Streetwear inspired by anime universes.",
            "cover_image": "https://images.unsplash.com/photo-1609873814058-a8928924184a?w=1600&q=80",
            "is_featured": True, "order": 1, "created_at": now_iso(),
        },
        {
            "id": gen_id(), "slug": "streetwear", "name": "Streetwear",
            "description": "Premium streetwear staples.",
            "cover_image": "https://images.unsplash.com/photo-1564557287817-3785e38ec1f5?w=1600&q=80",
            "is_featured": True, "order": 2, "created_at": now_iso(),
        },
        {
            "id": gen_id(), "slug": "essentials", "name": "Essentials",
            "description": "The foundation of every wardrobe.",
            "cover_image": "https://images.unsplash.com/photo-1603805752838-aa579d77da72?w=1600&q=80",
            "is_featured": True, "order": 3, "created_at": now_iso(),
        },
    ]
    await db.collections.insert_many(collections)
    by_slug = {c["slug"]: c for c in collections}

    products = [
        # Anime
        {
            "slug": "kaizen-black", "name": "Kaizen Oversized Tee — Black",
            "description": "Heavyweight 240 GSM oversized tee with custom anime-inspired graphics. Dropped shoulders, boxy fit, premium combed cotton.",
            "price": 1799, "sale_price": 1499, "collection": "anime",
            "images": [
                "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200&q=80",
                "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=1200&q=80",
                "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=1200&q=80",
            ],
            "fabric": "240 GSM Combed Cotton", "gsm": "240", "fit": "Oversized",
            "care": "Machine wash cold. Do not bleach.", "tags": ["new", "bestseller"],
            "is_featured": True,
        },
        {
            "slug": "shogun-cream", "name": "Shogun Oversized Tee — Cream",
            "description": "Premium oversized fit with subtle eastern-inspired embroidery on the chest. Ultra-soft 220 GSM cotton.",
            "price": 1899, "sale_price": 1599, "collection": "anime",
            "images": [
                "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=1200&q=80",
                "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=1200&q=80",
            ],
            "fabric": "220 GSM Combed Cotton", "gsm": "220", "fit": "Oversized",
            "care": "Machine wash cold. Tumble dry low.", "tags": ["new"],
            "is_featured": True,
        },
        {
            "slug": "ronin-hoodie-black", "name": "Ronin Premium Hoodie — Black",
            "description": "Heavyweight 380 GSM French terry hoodie. Drop shoulders, ribbed cuffs, kangaroo pocket, custom drawcords.",
            "price": 3499, "sale_price": 2999, "collection": "anime",
            "images": [
                "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=1200&q=80",
                "https://images.unsplash.com/photo-1620799139507-2a76f79a2f4d?w=1200&q=80",
            ],
            "fabric": "380 GSM French Terry", "gsm": "380", "fit": "Oversized",
            "care": "Machine wash cold. Do not bleach.", "tags": ["bestseller"],
            "is_featured": False,
        },
        # Streetwear
        {
            "slug": "iit-oversized-white", "name": "IIT Oversized Tee — White",
            "description": "Boxy fit oversized tee with raised print. Pre-shrunk, garment-dyed, 230 GSM premium cotton.",
            "price": 1599, "sale_price": 1299, "collection": "streetwear",
            "images": [
                "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200&q=80",
                "https://images.unsplash.com/photo-1554568218-0f1715e72254?w=1200&q=80",
            ],
            "fabric": "230 GSM Combed Cotton", "gsm": "230", "fit": "Oversized",
            "care": "Machine wash cold.", "tags": ["new"],
            "is_featured": True,
        },
        {
            "slug": "streetwear-drop-01", "name": "Drop 01 Boxy Tee — Charcoal",
            "description": "Inaugural drop. Acid-washed boxy tee with raw-cut hem and oversized back graphic.",
            "price": 1999, "sale_price": 1699, "collection": "streetwear",
            "images": [
                "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=1200&q=80",
                "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=1200&q=80",
            ],
            "fabric": "240 GSM Acid Wash Cotton", "gsm": "240", "fit": "Boxy Oversized",
            "care": "Machine wash inside out.", "tags": ["limited"],
            "is_featured": True,
        },
        {
            "slug": "cargo-pants-stone", "name": "Tactical Cargo — Stone",
            "description": "Premium ripstop cargo pants with utility pockets and adjustable hem drawcords.",
            "price": 2999, "sale_price": 2499, "collection": "streetwear",
            "images": [
                "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=1200&q=80",
                "https://images.unsplash.com/photo-1542272604-787c3835535d?w=1200&q=80",
            ],
            "fabric": "Cotton Ripstop", "gsm": "—", "fit": "Relaxed",
            "care": "Machine wash cold.", "tags": [], "is_featured": False,
        },
        # Essentials
        {
            "slug": "essential-tee-black", "name": "Essential Tee — Black",
            "description": "The perfect everyday tee. 200 GSM combed cotton, semi-relaxed fit, double-stitched hems.",
            "price": 999, "sale_price": 799, "collection": "essentials",
            "images": [
                "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=1200&q=80",
                "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=1200&q=80",
            ],
            "fabric": "200 GSM Combed Cotton", "gsm": "200", "fit": "Semi-Relaxed",
            "care": "Machine wash.", "tags": ["bestseller"],
            "is_featured": True,
        },
        {
            "slug": "essential-tee-white", "name": "Essential Tee — White",
            "description": "Wardrobe staple. Soft hand feel, breathable, pre-shrunk and ready to wear.",
            "price": 999, "sale_price": 799, "collection": "essentials",
            "images": [
                "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200&q=80",
                "https://images.unsplash.com/photo-1554568218-0f1715e72254?w=1200&q=80",
            ],
            "fabric": "200 GSM Combed Cotton", "gsm": "200", "fit": "Semi-Relaxed",
            "care": "Machine wash.", "tags": [], "is_featured": False,
        },
    ]
    docs = []
    for p in products:
        col = by_slug[p.pop("collection")]
        d = {
            "id": gen_id(),
            "slug": p["slug"], "name": p["name"], "description": p["description"],
            "price": p["price"], "sale_price": p.get("sale_price"),
            "images": p["images"], "collection_id": col["id"], "collection_slug": col["slug"],
            "sizes": _sizes(),
            "fabric": p["fabric"], "gsm": p["gsm"], "fit": p["fit"], "care": p["care"],
            "tags": p["tags"], "size_chart_image": None,
            "is_featured": p.get("is_featured", False), "is_hidden": False,
            "views": 0, "sold_count": 0,
            "seo_title": f'{p["name"]} | THE LIONEYO',
            "seo_description": p["description"][:160],
            "seo_keywords": ",".join(p.get("tags", []) + ["lioneyo", "streetwear"]),
            "og_image": p["images"][0],
            "created_at": now_iso(), "updated_at": now_iso(),
        }
        docs.append(d)
    await db.products.insert_many(docs)

    coupons = [
        {"id": gen_id(), "code": "WELCOME150", "discount_type": "flat", "discount_value": 150,
         "min_order": 999, "max_discount": None, "expiry": None,
         "usage_limit": 0, "used_count": 0, "is_active": True, "is_popup": True,
         "popup_button_text": "COPY WELCOME150", "created_at": now_iso()},
        {"id": gen_id(), "code": "LIONEYO10", "discount_type": "percent", "discount_value": 10,
         "min_order": 1499, "max_discount": 500, "expiry": None,
         "usage_limit": 0, "used_count": 0, "is_active": True, "is_popup": False,
         "popup_button_text": "COPY CODE", "created_at": now_iso()},
        {"id": gen_id(), "code": "INSTANT200", "discount_type": "flat", "discount_value": 200,
         "min_order": 1999, "max_discount": None, "expiry": None,
         "usage_limit": 0, "used_count": 0, "is_active": True, "is_popup": False,
         "popup_button_text": "COPY CODE", "created_at": now_iso()},
    ]
    await db.coupons.insert_many(coupons)
