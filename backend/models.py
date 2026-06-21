"""Pydantic models for THE LIONEYO ecommerce platform."""
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr, ConfigDict
import uuid


def gen_id() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------- Product ----------
class SizeStock(BaseModel):
    size: str  # XS, S, M, L, XL, XXL
    stock: int = 0


class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=gen_id)
    slug: str
    name: str
    description: str = ""
    price: float
    sale_price: Optional[float] = None
    images: List[str] = []
    collection_id: Optional[str] = None
    collection_slug: Optional[str] = None
    sizes: List[SizeStock] = []
    fabric: str = ""
    gsm: str = ""
    fit: str = ""
    care: str = ""
    tags: List[str] = []
    size_chart_image: Optional[str] = None
    is_featured: bool = False
    is_hidden: bool = False
    views: int = 0
    sold_count: int = 0
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None
    og_image: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class ProductCreate(BaseModel):
    slug: str
    name: str
    description: str = ""
    price: float
    sale_price: Optional[float] = None
    images: List[str] = []
    collection_id: Optional[str] = None
    collection_slug: Optional[str] = None
    sizes: List[SizeStock] = []
    fabric: str = ""
    gsm: str = ""
    fit: str = ""
    care: str = ""
    tags: List[str] = []
    size_chart_image: Optional[str] = None
    is_featured: bool = False
    is_hidden: bool = False
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None
    og_image: Optional[str] = None


# ---------- Collection ----------
class Collection(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=gen_id)
    slug: str
    name: str
    description: str = ""
    cover_image: Optional[str] = None
    is_featured: bool = False
    order: int = 0
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


class CollectionCreate(BaseModel):
    slug: str
    name: str
    description: str = ""
    cover_image: Optional[str] = None
    is_featured: bool = False
    order: int = 0
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None


# ---------- Order ----------
class OrderItem(BaseModel):
    product_id: str
    product_slug: str
    name: str
    image: str
    size: str
    qty: int
    price: float


class ShippingAddress(BaseModel):
    full_name: str
    phone: str
    email: EmailStr
    line1: str
    line2: Optional[str] = ""
    city: str
    state: str
    pincode: str
    country: str = "India"


class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=gen_id)
    order_number: str
    items: List[OrderItem]
    subtotal: float
    discount: float = 0
    shipping: float = 0
    cod_fee: float = 0
    total: float
    amount_paid: float = 0
    amount_due: float = 0
    payment_method: str  # "prepaid" | "partial_cod"
    payment_status: str = "pending"  # pending | paid | partial | failed
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    coupon_code: Optional[str] = None
    shipping_address: ShippingAddress
    user_email: Optional[str] = None
    status: str = "placed"  # placed | processing | packed | shipped | out_for_delivery | delivered | cancelled
    tracking_number: Optional[str] = None
    notes: str = ""
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class OrderCreate(BaseModel):
    items: List[OrderItem]
    subtotal: float
    discount: float = 0
    shipping: float = 0
    cod_fee: float = 0
    total: float
    payment_method: str
    coupon_code: Optional[str] = None
    shipping_address: ShippingAddress
    user_email: Optional[str] = None


# ---------- Coupon ----------
class Coupon(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=gen_id)
    code: str
    discount_type: str = "flat"  # flat | percent
    discount_value: float
    min_order: float = 0
    max_discount: Optional[float] = None
    expiry: Optional[str] = None
    usage_limit: int = 0  # 0 = unlimited
    used_count: int = 0
    is_active: bool = True
    is_popup: bool = False  # shows in popup
    popup_button_text: str = "COPY CODE"
    created_at: str = Field(default_factory=now_iso)


class CouponCreate(BaseModel):
    code: str
    discount_type: str = "flat"
    discount_value: float
    min_order: float = 0
    max_discount: Optional[float] = None
    expiry: Optional[str] = None
    usage_limit: int = 0
    is_active: bool = True
    is_popup: bool = False
    popup_button_text: str = "COPY CODE"


# ---------- Review ----------
class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=gen_id)
    product_id: str
    user_name: str
    user_email: str
    rating: int
    text: str
    images: List[str] = []
    verified_buyer: bool = False
    is_approved: bool = False
    created_at: str = Field(default_factory=now_iso)


class ReviewCreate(BaseModel):
    product_id: str
    user_name: str
    user_email: EmailStr
    rating: int
    text: str
    images: List[str] = []


# ---------- Settings ----------
class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "global"
    # Branding
    logo_light: Optional[str] = None  # used on white theme (dark logo)
    logo_dark: Optional[str] = None  # used on dark theme (white logo)
    favicon: Optional[str] = None
    # Announcement bar
    announcement_messages: List[str] = []
    announcement_enabled: bool = True
    # Hero
    hero_heading: str = "THE LIONEYO"
    hero_subheading: str = "Premium Streetwear. Crafted with Intention."
    hero_image: Optional[str] = None
    hero_video: Optional[str] = None
    hero_cta_text: str = "SHOP NOW"
    hero_cta_link: str = "/collection/all"
    # Shipping & COD
    shipping_fee: float = 120
    free_shipping_threshold: float = 2999
    cod_enabled: bool = True
    cod_advance: float = 150
    cod_fee: float = 0
    # WhatsApp
    whatsapp_number: str = "9557843135"
    whatsapp_order_template: str = "Hi! Your LIONEYO order #{order} has been placed successfully."
    whatsapp_shipped_template: str = "Your LIONEYO order #{order} has been shipped. Track: {tracking}"
    whatsapp_delivered_template: str = "Your LIONEYO order #{order} has been delivered. Thank you!"
    # Razorpay
    razorpay_key_id: Optional[str] = None
    razorpay_key_secret: Optional[str] = None
    razorpay_webhook_secret: Optional[str] = None
    # Cloudflare R2
    r2_account_id: Optional[str] = None
    r2_bucket: Optional[str] = None
    r2_access_key: Optional[str] = None
    r2_secret_key: Optional[str] = None
    r2_public_url: Optional[str] = None
    r2_endpoint: Optional[str] = None
    # Google
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    google_sheets_webhook: Optional[str] = None
    # SEO
    site_title: str = "THE LIONEYO — Premium Streetwear"
    site_description: str = "Luxury streetwear, crafted with intention. Shop the latest drops from THE LIONEYO."
    site_keywords: str = "lioneyo, streetwear, premium tshirts, oversized fits, anime collection"
    og_image: Optional[str] = None
    # Footer
    instagram_url: str = "https://instagram.com/thelioneyo"
    youtube_url: str = ""
    footer_text: str = "© THE LIONEYO. All rights reserved."
    privacy_policy: str = ""
    terms: str = ""
    refund_policy: str = ""
    shipping_policy: str = ""
    # Trust badges
    trust_badges: List[str] = ["Secure Checkout", "Razorpay Protected", "Premium Quality", "Fast Shipping", "Trusted Brand", "Safe Payments"]
    low_stock_threshold: int = 5


# ---------- Admin user ----------
class AdminUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=gen_id)
    email: str
    password_hash: str
    created_at: str = Field(default_factory=now_iso)


class LoginInput(BaseModel):
    email: EmailStr
    password: str


# ---------- Customer / Wishlist ----------
class WishlistItem(BaseModel):
    email: str
    product_id: str
    created_at: str = Field(default_factory=now_iso)
