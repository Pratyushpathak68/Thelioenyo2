import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import Razorpay from 'razorpay';
import { v4 as uuidv4 } from 'uuid';
import { JWT_SECRET, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_GATEWAY_URL, GOOGLE_SHEETS_WEBHOOK } from './config.js';

export function genId() {
  return uuidv4();
}

export function nowIso() {
  return new Date().toISOString();
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hashed) {
  try {
    return bcrypt.compare(password, hashed);
  } catch (error) {
    return false;
  }
}

export function makeToken(payload) {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { ...payload, iat: now, exp: now + 86400 * 7 },
    JWT_SECRET,
    { algorithm: 'HS256' }
  );
}

export function getRazorpayClient(settings = {}) {
  const keyId = settings.razorpay_key_id || RAZORPAY_KEY_ID;
  const keySecret = settings.razorpay_key_secret || RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('Razorpay not configured');
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export function createRazorpayOrder(orderNumber, amount) {
  return getRazorpayClient().orders.create({
    amount: Math.round(amount * 100),
    currency: 'INR',
    receipt: orderNumber.slice(0, 40),
    payment_capture: 1,
    notes: { order_number: orderNumber },
  });
}

export function normalizePhone(raw) {
  const cleaned = String(raw || '').replace(/[^0-9]/g, '');
  if (!cleaned) return '';
  if (cleaned.length === 10) return `91${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith('0')) return `91${cleaned.slice(1)}`;
  if (cleaned.length === 12 && cleaned.startsWith('91')) return cleaned;
  return '';
}

export function waTemplate(template, order = {}, extra = {}) {
  const data = {
    order: order.order_number || '',
    tracking: order.tracking_number || '—',
    due: String(order.amount_due || 0),
    name: (order.shipping_address && order.shipping_address.full_name) || '',
    ...extra,
  };
  return String(template || '').replace(/\{(\w+)\}/g, (_, key) => data[key] ?? '');
}

export async function sendWhatsapp(phone, message) {
  if (!phone || !message) {
    return { ok: false, skipped: true, reason: 'no_phone_or_message' };
  }
  const to = normalizePhone(phone);
  if (!to) {
    return { ok: false, skipped: true, reason: 'bad_phone' };
  }

  if (WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_ID) {
    try {
      const response = await axios.post(
        `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message },
        },
        {
          headers: {
            Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
      return { ok: true, provider: 'meta', response: response.data };
    } catch (error) {
      console.warn('WA Meta send failed', error?.response?.data || error.message);
    }
  }

  if (WHATSAPP_GATEWAY_URL) {
    try {
      const response = await axios.post(WHATSAPP_GATEWAY_URL, { phone: to, message }, { timeout: 10000 });
      return { ok: response.status < 400, provider: 'gateway', status: response.status };
    } catch (error) {
      console.warn('WA gateway exception', error?.response?.data || error.message);
    }
  }

  return { ok: false, skipped: true, reason: 'not_configured' };
}

export async function notifyWhatsapp(db, order, event) {
  if (!order) return;
  const already = new Set(order.wa_notified || []);
  if (already.has(event)) return;
  const templateKey = {
    placed: 'whatsapp_order_template',
    shipped: 'whatsapp_shipped_template',
    delivered: 'whatsapp_delivered_template',
    cod_reminder: 'whatsapp_cod_reminder_template',
  }[event];
  if (!templateKey) return;
  const settings = await db.collection('settings').findOne({ id: 'global' }) || {};
  const template = settings[templateKey] || '';
  const message = waTemplate(template, order);
  const result = await sendWhatsapp(order.shipping_address?.phone, message);
  if (result.ok) {
    await db.collection('orders').updateOne(
      { id: order.id },
      { $addToSet: { wa_notified: event }, $set: { updated_at: nowIso() } }
    );
  }
}

export const defaultSettings = {
  id: 'global',
  logo_light: null,
  logo_dark: null,
  favicon: null,
  announcement_messages: [],
  announcement_enabled: true,
  hero_heading: 'THE LIONEYO',
  hero_subheading: 'Premium Streetwear. Crafted with Intention.',
  hero_image: null,
  hero_video: null,
  hero_cta_text: 'SHOP NOW',
  hero_cta_link: '/collection/all',
  shipping_fee: 120,
  free_shipping_threshold: 2999,
  cod_enabled: true,
  cod_advance: 150,
  cod_fee: 0,
  whatsapp_number: '9557843135',
  whatsapp_order_template: 'Hi! Your LIONEYO order #{order} has been placed successfully.',
  whatsapp_shipped_template: 'Your LIONEYO order #{order} has been shipped. Track: {tracking}',
  whatsapp_delivered_template: 'Your LIONEYO order #{order} has been delivered. Thank you!',
  whatsapp_cod_reminder_template: 'Reminder: Your LIONEYO order #{order} has ₹{due} due on delivery. Keep cash ready.',
  whatsapp_access_token: null,
  whatsapp_phone_id: null,
  whatsapp_gateway_url: null,
  referral_enabled: true,
  referral_discount_type: 'percent',
  referral_discount_value: 10,
  referral_min_order: 0,
  referral_max_discount: 500,
  razorpay_key_id: null,
  razorpay_key_secret: null,
  razorpay_webhook_secret: null,
  r2_account_id: null,
  r2_bucket: null,
  r2_access_key: null,
  r2_secret_key: null,
  r2_public_url: null,
  r2_endpoint: null,
  google_client_id: null,
  google_client_secret: null,
  google_sheets_webhook: null,
  site_title: 'THE LIONEYO — Premium Streetwear',
  site_description: 'Luxury streetwear, crafted with intention. Shop the latest drops from THE LIONEYO.',
  site_keywords: 'lioneyo, streetwear, premium tshirts, oversized fits, anime collection',
  og_image: null,
  instagram_url: 'https://instagram.com/thelioneyo',
  youtube_url: '',
  footer_text: '© THE LIONEYO. All rights reserved.',
  privacy_policy: '',
  terms: '',
  refund_policy: '',
  shipping_policy: '',
  trust_badges: ['Secure Checkout', 'Razorpay Protected', 'Premium Quality', 'Fast Shipping', 'Trusted Brand', 'Safe Payments'],
  low_stock_threshold: 5,
};

export const collectionsSeed = [
  {
    id: genId(),
    slug: 'anime',
    name: 'Anime',
    description: 'Streetwear inspired by anime universes.',
    cover_image: 'https://images.unsplash.com/photo-1609873814058-a8928924184a?w=1600&q=80',
    is_featured: true,
    order: 1,
    created_at: nowIso(),
  },
  {
    id: genId(),
    slug: 'streetwear',
    name: 'Streetwear',
    description: 'Premium streetwear staples.',
    cover_image: 'https://images.unsplash.com/photo-1564557287817-3785e38ec1f5?w=1600&q=80',
    is_featured: true,
    order: 2,
    created_at: nowIso(),
  },
  {
    id: genId(),
    slug: 'essentials',
    name: 'Essentials',
    description: 'The foundation of every wardrobe.',
    cover_image: 'https://images.unsplash.com/photo-1603805752838-aa579d77da72?w=1600&q=80',
    is_featured: true,
    order: 3,
    created_at: nowIso(),
  },
];

const productTemplate = (data, collection) => ({
  id: genId(),
  slug: data.slug,
  name: data.name,
  description: data.description,
  price: data.price,
  sale_price: data.sale_price ?? null,
  images: data.images,
  collection_id: collection.id,
  collection_slug: collection.slug,
  sizes: [
    { size: 'XS', stock: 8 },
    { size: 'S', stock: 14 },
    { size: 'M', stock: 18 },
    { size: 'L', stock: 16 },
    { size: 'XL', stock: 10 },
    { size: 'XXL', stock: 6 },
  ],
  fabric: data.fabric,
  gsm: data.gsm,
  fit: data.fit,
  care: data.care,
  tags: data.tags,
  size_chart_image: null,
  is_featured: data.is_featured || false,
  is_hidden: false,
  views: 0,
  sold_count: 0,
  seo_title: `${data.name} | THE LIONEYO`,
  seo_description: data.description.slice(0, 160),
  seo_keywords: [...(data.tags || []), 'lioneyo', 'streetwear'].join(','),
  og_image: data.images[0] || null,
  created_at: nowIso(),
  updated_at: nowIso(),
});

export const productsSeed = [
  {
    slug: 'kaizen-black',
    name: 'Kaizen Oversized Tee — Black',
    description: 'Heavyweight 240 GSM oversized tee with custom anime-inspired graphics. Dropped shoulders, boxy fit, premium combed cotton.',
    price: 1799,
    sale_price: 1499,
    collection: 'anime',
    images: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200&q=80',
      'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=1200&q=80',
      'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=1200&q=80',
    ],
    fabric: '240 GSM Combed Cotton',
    gsm: '240',
    fit: 'Oversized',
    care: 'Machine wash cold. Do not bleach.',
    tags: ['new', 'bestseller'],
    is_featured: true,
  },
  {
    slug: 'shogun-cream',
    name: 'Shogun Oversized Tee — Cream',
    description: 'Premium oversized fit with subtle eastern-inspired embroidery on the chest. Ultra-soft 220 GSM cotton.',
    price: 1899,
    sale_price: 1599,
    collection: 'anime',
    images: [
      'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=1200&q=80',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=1200&q=80',
    ],
    fabric: '220 GSM Combed Cotton',
    gsm: '220',
    fit: 'Oversized',
    care: 'Machine wash cold. Tumble dry low.',
    tags: ['new'],
    is_featured: true,
  },
  {
    slug: 'ronin-hoodie-black',
    name: 'Ronin Premium Hoodie — Black',
    description: 'Heavyweight 380 GSM French terry hoodie. Drop shoulders, ribbed cuffs, kangaroo pocket, custom drawcords.',
    price: 3499,
    sale_price: 2999,
    collection: 'anime',
    images: [
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=1200&q=80',
      'https://images.unsplash.com/photo-1620799139507-2a76f79a2f4d?w=1200&q=80',
    ],
    fabric: '380 GSM French Terry',
    gsm: '380',
    fit: 'Oversized',
    care: 'Machine wash cold. Do not bleach.',
    tags: ['bestseller'],
    is_featured: false,
  },
  {
    slug: 'iit-oversized-white',
    name: 'IIT Oversized Tee — White',
    description: 'Boxy fit oversized tee with raised print. Pre-shrunk, garment-dyed, 230 GSM premium cotton.',
    price: 1599,
    sale_price: 1299,
    collection: 'streetwear',
    images: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200&q=80',
      'https://images.unsplash.com/photo-1554568218-0f1715e72254?w=1200&q=80',
    ],
    fabric: '230 GSM Combed Cotton',
    gsm: '230',
    fit: 'Oversized',
    care: 'Machine wash cold.',
    tags: ['new'],
    is_featured: true,
  },
  {
    slug: 'streetwear-drop-01',
    name: 'Drop 01 Boxy Tee — Charcoal',
    description: 'Inaugural drop. Acid-washed boxy tee with raw-cut hem and oversized back graphic.',
    price: 1999,
    sale_price: 1699,
    collection: 'streetwear',
    images: [
      'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=1200&q=80',
      'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=1200&q=80',
    ],
    fabric: '240 GSM Acid Wash Cotton',
    gsm: '240',
    fit: 'Boxy Oversized',
    care: 'Machine wash inside out.',
    tags: ['limited'],
    is_featured: true,
  },
  {
    slug: 'cargo-pants-stone',
    name: 'Tactical Cargo — Stone',
    description: 'Premium ripstop cargo pants with utility pockets and adjustable hem drawcords.',
    price: 2999,
    sale_price: 2499,
    collection: 'streetwear',
    images: [
      'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=1200&q=80',
      'https://images.unsplash.com/photo-1542272604-787c3835535d?w=1200&q=80',
    ],
    fabric: 'Cotton Ripstop',
    gsm: '—',
    fit: 'Relaxed',
    care: 'Machine wash cold.',
    tags: [],
    is_featured: false,
  },
  {
    slug: 'essential-tee-black',
    name: 'Essential Tee — Black',
    description: 'The perfect everyday tee. 200 GSM combed cotton, semi-relaxed fit, double-stitched hems.',
    price: 999,
    sale_price: 799,
    collection: 'essentials',
    images: [
      'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=1200&q=80',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=1200&q=80',
    ],
    fabric: '200 GSM Combed Cotton',
    gsm: '200',
    fit: 'Semi-Relaxed',
    care: 'Machine wash.',
    tags: ['bestseller'],
    is_featured: true,
  },
  {
    slug: 'essential-tee-white',
    name: 'Essential Tee — White',
    description: 'Wardrobe staple. Soft hand feel, breathable, pre-shrunk and ready to wear.',
    price: 999,
    sale_price: 799,
    collection: 'essentials',
    images: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200&q=80',
      'https://images.unsplash.com/photo-1554568218-0f1715e72254?w=1200&q=80',
    ],
    fabric: '200 GSM Combed Cotton',
    gsm: '200',
    fit: 'Semi-Relaxed',
    care: 'Machine wash.',
    tags: [],
    is_featured: false,
  },
].map((product) => ({ data: product }));

export const couponsSeed = [
  {
    id: genId(),
    code: 'WELCOME150',
    discount_type: 'flat',
    discount_value: 150,
    min_order: 999,
    max_discount: null,
    expiry: null,
    usage_limit: 0,
    used_count: 0,
    is_active: true,
    is_popup: true,
    popup_button_text: 'COPY WELCOME150',
    created_at: nowIso(),
  },
  {
    id: genId(),
    code: 'LIONEYO10',
    discount_type: 'percent',
    discount_value: 10,
    min_order: 1499,
    max_discount: 500,
    expiry: null,
    usage_limit: 0,
    used_count: 0,
    is_active: true,
    is_popup: false,
    popup_button_text: 'COPY CODE',
    created_at: nowIso(),
  },
  {
    id: genId(),
    code: 'INSTANT200',
    discount_type: 'flat',
    discount_value: 200,
    min_order: 1999,
    max_discount: null,
    expiry: null,
    usage_limit: 0,
    used_count: 0,
    is_active: true,
    is_popup: false,
    popup_button_text: 'COPY CODE',
    created_at: nowIso(),
  },
];

export function buildProduct(data, collection) {
  return productTemplate(data, collection);
}
