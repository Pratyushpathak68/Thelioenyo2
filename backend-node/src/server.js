import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import axios from 'axios';
import { connectDb, getDb } from './db.js';
import { hashPassword, verifyPassword, makeToken, genId, nowIso, getRazorpayClient, notifyWhatsapp, defaultSettings } from './utils.js';
import { JWT_SECRET, PORT, GOOGLE_SHEETS_WEBHOOK, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET } from './config.js';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Missing token' });
  }
  const token = auth.slice(7);
  try {
    const data = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    if (data.role !== 'admin') {
      return res.status(403).json({ detail: 'Not admin' });
    }
    req.admin = data;
    next();
  } catch (error) {
    return res.status(401).json({ detail: 'Invalid token' });
  }
}

function makeOrderNumber() {
  return `LE${Math.floor(Date.now() / 1000)}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

async function getSettings() {
  const db = getDb();
  let settings = await db.collection('settings').findOne({ id: 'global' });
  if (!settings) {
    await db.collection('settings').insertOne(defaultSettings);
    settings = defaultSettings;
  }
  return settings;
}

function cleanObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const cleaned = { ...obj };
  delete cleaned.id;
  delete cleaned._id;
  return cleaned;
}

app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ detail: 'Email and password required' });
  }
  const db = getDb();
  const user = await db.collection('admins').findOne({ email: email.toLowerCase() });
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return res.status(401).json({ detail: 'Invalid credentials' });
  }
  const token = makeToken({ role: 'admin', email: user.email });
  return res.json({ token, email: user.email });
});

app.post('/api/admin/change-password', requireAdmin, async (req, res) => {
  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password || new_password.length < 8) {
    return res.status(400).json({ detail: 'new_password must be at least 8 characters' });
  }
  const db = getDb();
  const user = await db.collection('admins').findOne({ email: req.admin.email });
  if (!user || !(await verifyPassword(current_password, user.password_hash))) {
    return res.status(401).json({ detail: 'Current password incorrect' });
  }
  await db.collection('admins').updateOne(
    { email: req.admin.email },
    { $set: { password_hash: await hashPassword(new_password), updated_at: nowIso() } }
  );
  return res.json({ ok: true });
});

app.get('/api/admin/me', requireAdmin, (req, res) => {
  res.json({ email: req.admin.email, role: req.admin.role });
});

app.get('/api/settings', async (req, res) => {
  const settings = await getSettings();
  const publicKeys = new Set([
    'logo_light', 'logo_dark', 'favicon', 'announcement_messages', 'announcement_enabled',
    'hero_heading', 'hero_subheading', 'hero_image', 'hero_video', 'hero_cta_text', 'hero_cta_link',
    'shipping_fee', 'free_shipping_threshold', 'cod_enabled', 'cod_advance', 'cod_fee',
    'whatsapp_number', 'site_title', 'site_description', 'site_keywords', 'og_image',
    'instagram_url', 'youtube_url', 'footer_text', 'privacy_policy', 'terms', 'refund_policy', 'shipping_policy',
    'trust_badges', 'low_stock_threshold', 'razorpay_key_id', 'google_client_id',
  ]);
  const payload = {};
  for (const key of Object.keys(settings)) {
    if (publicKeys.has(key)) {
      payload[key] = settings[key];
    }
  }
  res.json(payload);
});

app.get('/api/admin/settings', requireAdmin, async (req, res) => {
  const settings = await getSettings();
  const cleaned = { ...settings };
  delete cleaned._id;
  res.json(cleaned);
});

app.put('/api/admin/settings', requireAdmin, async (req, res) => {
  const payload = cleanObject(req.body || {});
  const db = getDb();
  await db.collection('settings').updateOne({ id: 'global' }, { $set: payload }, { upsert: true });
  const settings = await getSettings();
  res.json(settings);
});

app.get('/api/collections', async (req, res) => {
  const db = getDb();
  const collections = await db.collection('collections').find({}, { projection: { _id: 0 } }).sort({ order: 1 }).toArray();
  res.json(collections);
});

app.get('/api/collections/:slug', async (req, res) => {
  const db = getDb();
  const doc = await db.collection('collections').findOne({ slug: req.params.slug }, { projection: { _id: 0 } });
  if (!doc) return res.status(404).json({ detail: 'Not found' });
  res.json(doc);
});

app.post('/api/admin/collections', requireAdmin, async (req, res) => {
  const body = req.body || {};
  const db = getDb();
  if (await db.collection('collections').findOne({ slug: body.slug })) {
    return res.status(400).json({ detail: 'Slug exists' });
  }
  const collection = { ...body, id: genId(), created_at: nowIso() };
  await db.collection('collections').insertOne(collection);
  res.json(collection);
});

app.put('/api/admin/collections/:cid', requireAdmin, async (req, res) => {
  const body = cleanObject(req.body || {});
  const db = getDb();
  await db.collection('collections').updateOne({ id: req.params.cid }, { $set: body });
  const updated = await db.collection('collections').findOne({ id: req.params.cid }, { projection: { _id: 0 } });
  res.json(updated);
});

app.delete('/api/admin/collections/:cid', requireAdmin, async (req, res) => {
  const db = getDb();
  await db.collection('collections').deleteOne({ id: req.params.cid });
  res.json({ ok: true });
});

app.get('/api/products', async (req, res) => {
  const collection = req.query.collection;
  const featured = req.query.featured === 'true';
  const limit = Math.min(Number(req.query.limit) || 100, 1000);
  const query = { is_hidden: false };
  if (collection && collection !== 'all') query.collection_slug = collection;
  if (featured) query.is_featured = true;
  const docs = await getDb().collection('products').find(query, { projection: { _id: 0 } }).limit(limit).toArray();
  res.json(docs);
});

app.get('/api/products/:slug', async (req, res) => {
  const db = getDb();
  const doc = await db.collection('products').findOne({ slug: req.params.slug }, { projection: { _id: 0 } });
  if (!doc) return res.status(404).json({ detail: 'Not found' });
  await db.collection('products').updateOne({ slug: req.params.slug }, { $inc: { views: 1 } });
  res.json(doc);
});

app.get('/api/products/:slug/related', async (req, res) => {
  const db = getDb();
  const product = await db.collection('products').findOne({ slug: req.params.slug }, { projection: { _id: 0 } });
  if (!product) return res.json([]);
  const query = { slug: { $ne: req.params.slug }, is_hidden: false };
  if (product.collection_slug) query.collection_slug = product.collection_slug;
  const docs = await db.collection('products').find(query, { projection: { _id: 0 } }).limit(8).toArray();
  res.json(docs);
});

app.post('/api/admin/products', requireAdmin, async (req, res) => {
  const body = req.body || {};
  const db = getDb();
  if (await db.collection('products').findOne({ slug: body.slug })) {
    return res.status(400).json({ detail: 'Slug exists' });
  }
  const product = { ...body, id: genId(), created_at: nowIso(), updated_at: nowIso(), views: 0, sold_count: 0 };
  await db.collection('products').insertOne(product);
  res.json(product);
});

app.put('/api/admin/products/:pid', requireAdmin, async (req, res) => {
  const body = cleanObject(req.body || {});
  body.updated_at = nowIso();
  const db = getDb();
  await db.collection('products').updateOne({ id: req.params.pid }, { $set: body });
  const updated = await db.collection('products').findOne({ id: req.params.pid }, { projection: { _id: 0 } });
  res.json(updated);
});

app.delete('/api/admin/products/:pid', requireAdmin, async (req, res) => {
  await getDb().collection('products').deleteOne({ id: req.params.pid });
  res.json({ ok: true });
});

app.post('/api/admin/products/:pid/duplicate', requireAdmin, async (req, res) => {
  const db = getDb();
  const doc = await db.collection('products').findOne({ id: req.params.pid }, { projection: { _id: 0 } });
  if (!doc) return res.status(404).json({ detail: 'Not found' });
  const copy = { ...doc };
  copy.id = genId();
  copy.slug = `${copy.slug}-copy-${crypto.randomBytes(3).toString('hex')}`;
  copy.name = `${copy.name} (Copy)`;
  copy.is_hidden = true;
  copy.created_at = nowIso();
  copy.updated_at = nowIso();
  await db.collection('products').insertOne(copy);
  res.json(copy);
});

app.get('/api/coupons/popup', async (req, res) => {
  const coupon = await getDb().collection('coupons').findOne({ is_popup: true, is_active: true }, { projection: { _id: 0 } });
  res.json(coupon || null);
});

app.post('/api/coupons/validate', async (req, res) => {
  const code = String((req.body?.code || '').toUpperCase());
  const subtotal = parseFloat(req.body?.subtotal || 0);
  const coupon = await getDb().collection('coupons').findOne({ code, is_active: true });
  if (!coupon) return res.status(404).json({ detail: 'Invalid coupon' });
  if (subtotal < (coupon.min_order || 0)) {
    return res.status(400).json({ detail: `Minimum order ₹${coupon.min_order}` });
  }
  if (coupon.usage_limit > 0 && (coupon.used_count || 0) >= coupon.usage_limit) {
    return res.status(400).json({ detail: 'Coupon limit reached' });
  }
  let discount = coupon.discount_type === 'flat' ? coupon.discount_value : (subtotal * coupon.discount_value) / 100;
  if (coupon.max_discount) discount = Math.min(discount, coupon.max_discount);
  res.json({ code, discount: Math.round(discount * 100) / 100, discount_type: coupon.discount_type });
});

app.post('/api/referrals/validate', async (req, res) => {
  const code = String((req.body?.code || '').toUpperCase()).trim();
  const subtotal = parseFloat(req.body?.subtotal || 0);
  const email = String((req.body?.email || '').toLowerCase()).trim();
  if (!code) return res.status(400).json({ detail: 'Code required' });
  const settings = await getSettings();
  if (!settings.referral_enabled) return res.status(400).json({ detail: 'Referrals disabled' });
  if (subtotal < (settings.referral_min_order || 0)) {
    return res.status(400).json({ detail: `Minimum order ₹${settings.referral_min_order}` });
  }
  const referrer = await getDb().collection('users').findOne({ referral_code: code });
  if (!referrer) return res.status(404).json({ detail: 'Invalid referral code' });
  if (email && referrer.email?.toLowerCase() === email) {
    return res.status(400).json({ detail: 'Cannot use your own referral code' });
  }
  const discountType = settings.referral_discount_type || 'percent';
  const discountValue = Number(settings.referral_discount_value || 10);
  let discount = discountType === 'flat' ? discountValue : (subtotal * discountValue) / 100;
  if (settings.referral_max_discount) discount = Math.min(discount, Number(settings.referral_max_discount));
  res.json({ code, discount: Math.round(discount * 100) / 100, discount_type: discountType, referrer_email: referrer.email });
});

app.get('/api/admin/coupons', requireAdmin, async (req, res) => {
  const coupons = await getDb().collection('coupons').find({}, { projection: { _id: 0 } }).toArray();
  res.json(coupons);
});

app.post('/api/admin/coupons', requireAdmin, async (req, res) => {
  const body = req.body || {};
  const code = String(body.code || '').toUpperCase();
  if (await getDb().collection('coupons').findOne({ code })) {
    return res.status(400).json({ detail: 'Code exists' });
  }
  const coupon = { ...body, code, id: genId(), created_at: nowIso(), used_count: body.used_count || 0 };
  await getDb().collection('coupons').insertOne(coupon);
  res.json(coupon);
});

app.put('/api/admin/coupons/:cid', requireAdmin, async (req, res) => {
  const body = cleanObject(req.body || {});
  if (body.code) body.code = String(body.code).toUpperCase();
  await getDb().collection('coupons').updateOne({ id: req.params.cid }, { $set: body });
  const updated = await getDb().collection('coupons').findOne({ id: req.params.cid }, { projection: { _id: 0 } });
  res.json(updated);
});

app.delete('/api/admin/coupons/:cid', requireAdmin, async (req, res) => {
  await getDb().collection('coupons').deleteOne({ id: req.params.cid });
  res.json({ ok: true });
});

app.get('/api/reviews/:product_id', async (req, res) => {
  const docs = await getDb().collection('reviews').find({ product_id: req.params.product_id, is_approved: true }, { projection: { _id: 0 } }).toArray();
  res.json(docs);
});

app.post('/api/reviews', async (req, res) => {
  const body = req.body || {};
  const review = { ...body, id: genId(), created_at: nowIso(), images: body.images || [], verified_buyer: false, is_approved: false };
  if (await getDb().collection('orders').findOne({ user_email: body.user_email })) {
    review.verified_buyer = true;
  }
  await getDb().collection('reviews').insertOne(review);
  res.json(review);
});

app.get('/api/admin/reviews', requireAdmin, async (req, res) => {
  const docs = await getDb().collection('reviews').find({}, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray();
  res.json(docs);
});

app.put('/api/admin/reviews/:rid', requireAdmin, async (req, res) => {
  const body = cleanObject(req.body || {});
  await getDb().collection('reviews').updateOne({ id: req.params.rid }, { $set: body });
  const updated = await getDb().collection('reviews').findOne({ id: req.params.rid }, { projection: { _id: 0 } });
  res.json(updated);
});

app.delete('/api/admin/reviews/:rid', requireAdmin, async (req, res) => {
  await getDb().collection('reviews').deleteOne({ id: req.params.rid });
  res.json({ ok: true });
});

app.post('/api/orders/create', async (req, res) => {
  const body = req.body || {};
  const settings = await getSettings();
  const orderNumber = makeOrderNumber();
  const paymentMethod = body.payment_method;
  const payableNow = paymentMethod === 'partial_cod' ? Number(settings.cod_advance || 150) : Number(body.total || 0);
  const amountDue = paymentMethod === 'partial_cod' ? Number(body.total || 0) - payableNow : 0;

  const order = {
    id: genId(),
    order_number: orderNumber,
    items: body.items || [],
    subtotal: Number(body.subtotal || 0),
    discount: Number(body.discount || 0),
    shipping: Number(body.shipping || 0),
    cod_fee: Number(body.cod_fee || 0),
    total: Number(body.total || 0),
    amount_paid: 0,
    amount_due: amountDue,
    payment_method: paymentMethod,
    payment_status: 'pending',
    razorpay_order_id: null,
    razorpay_payment_id: null,
    coupon_code: body.coupon_code || null,
    referral_code: body.referral_code || null,
    referral_discount: Number(body.referral_discount || 0),
    shipping_address: body.shipping_address || {},
    user_email: body.user_email || body.shipping_address?.email || '',
    status: 'placed',
    tracking_number: null,
    notes: '',
    wa_notified: [],
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  try {
    const client = getRazorpayClient(settings);
    const rzpOrder = await client.orders.create({
      amount: Math.round(payableNow * 100),
      currency: 'INR',
      receipt: orderNumber.slice(0, 40),
      payment_capture: 1,
      notes: { order_number: orderNumber },
    });
    order.razorpay_order_id = rzpOrder.id;
    await getDb().collection('orders').insertOne(order);
    return res.json({
      order,
      razorpay: {
        key_id: settings.razorpay_key_id || RAZORPAY_KEY_ID,
        order_id: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
      },
      payable_now: payableNow,
      amount_due: amountDue,
    });
  } catch (error) {
    console.error('Razorpay error:', error);
    return res.status(500).json({ detail: 'Payment provider error' });
  }
});

app.post('/api/orders/verify', async (req, res) => {
  const payload = req.body || {};
  const orderId = payload.razorpay_order_id;
  const payId = payload.razorpay_payment_id;
  const sig = payload.razorpay_signature;
  const settings = await getSettings();
  const secret = settings.razorpay_key_secret || RAZORPAY_KEY_SECRET;
  if (!orderId || !payId || !sig || !secret) {
    return res.status(400).json({ detail: 'Missing fields' });
  }

  const digest = crypto.createHmac('sha256', secret).update(`${orderId}|${payId}`).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(sig))) {
    return res.status(400).json({ detail: 'Invalid signature' });
  }

  const db = getDb();
  const order = await db.collection('orders').findOne({ razorpay_order_id: orderId });
  if (!order) return res.status(404).json({ detail: 'Order not found' });

  const paid = order.payment_method === 'partial_cod' ? Number(settings.cod_advance || 150) : order.total;
  const status = order.payment_method === 'partial_cod' ? 'partial' : 'paid';
  const update = {
    razorpay_payment_id: payId,
    amount_paid: paid,
    amount_due: order.total - paid,
    payment_status: status,
    status: 'processing',
    updated_at: nowIso(),
  };
  await db.collection('orders').updateOne({ id: order.id }, { $set: update });

  for (const item of order.items || []) {
    await db.collection('products').updateOne(
      { id: item.product_id, 'sizes.size': item.size },
      { $inc: { 'sizes.$.stock': -item.qty, sold_count: item.qty } }
    );
  }
  if (order.coupon_code) {
    await db.collection('coupons').updateOne({ code: order.coupon_code }, { $inc: { used_count: 1 } });
  }
  if (order.referral_code) {
    await db.collection('referral_uses').insertOne({
      id: genId(),
      referral_code: order.referral_code,
      order_id: order.id,
      order_number: order.order_number,
      referee_email: order.user_email,
      discount: order.referral_discount,
      created_at: nowIso(),
    });
    await db.collection('users').updateOne(
      { referral_code: order.referral_code },
      { $inc: { referral_count: 1, referral_earnings: order.referral_discount || 0 } }
    );
  }

  if (GOOGLE_SHEETS_WEBHOOK) {
    try {
      await axios.post(GOOGLE_SHEETS_WEBHOOK, { ...order, ...update }, { timeout: 5000 });
    } catch (error) {
      console.warn('Sheets sync failed:', error.message);
    }
  }

  const refreshed = await db.collection('orders').findOne({ id: order.id });
  try {
    await notifyWhatsapp(db, refreshed, 'placed');
    if (refreshed.payment_method === 'partial_cod') {
      await notifyWhatsapp(db, refreshed, 'cod_reminder');
    }
  } catch (error) {
    console.warn('WA notify failed:', error.message);
  }

  res.json({ ok: true, order_number: order.order_number });
});

app.post('/api/razorpay/webhook', express.raw({ type: '*/*' }), async (req, res) => {
  const body = req.body;
  const signature = req.headers['x-razorpay-signature'] || '';
  const secret = RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(500).json({ detail: 'Webhook secret not configured' });
  }
  const digest = crypto.createHmac('sha256', secret).update(body).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))) {
    console.warn('Razorpay webhook signature mismatch');
    return res.status(400).json({ detail: 'Invalid signature' });
  }
  let payload;
  try {
    payload = JSON.parse(body.toString());
  } catch (error) {
    return res.status(400).json({ detail: 'Bad JSON' });
  }
  const event = payload.event;
  const payment = payload.payload?.payment?.entity || {};
  const rzpOrderId = payment.order_id;
  if (!rzpOrderId) return res.json({ ok: true, ignored: true });

  const db = getDb();
  const order = await db.collection('orders').findOne({ razorpay_order_id: rzpOrderId });
  if (!order) {
    console.info(`Webhook for unknown order ${rzpOrderId}`);
    return res.json({ ok: true, unknown: true });
  }

  const update = { updated_at: nowIso() };
  if (['payment.captured', 'order.paid'].includes(event)) {
    const webhookSettings = await getSettings();
    update.razorpay_payment_id = payment.id;
    update.amount_paid = order.payment_method === 'partial_cod' ? Number(webhookSettings.cod_advance || 150) : order.total;
    update.amount_due = order.total - update.amount_paid;
    update.payment_status = order.payment_method === 'partial_cod' ? 'partial' : 'paid';
    if (order.status === 'placed') update.status = 'processing';
  } else if (event === 'payment.failed') {
    update.payment_status = 'failed';
  }

  await db.collection('orders').updateOne({ id: order.id }, { $set: update });
  if (['paid', 'partial'].includes(update.payment_status)) {
    const refreshed = await db.collection('orders').findOne({ id: order.id });
    try {
      await notifyWhatsapp(db, refreshed, 'placed');
      if (refreshed.payment_method === 'partial_cod') {
        await notifyWhatsapp(db, refreshed, 'cod_reminder');
      }
    } catch (error) {
      console.warn('WA notify (webhook) failed:', error.message);
    }
  }

  res.json({ ok: true, event });
});

app.get('/api/orders/track/:order_number', async (req, res) => {
  const orderNumber = String(req.params.order_number).toUpperCase();
  const doc = await getDb().collection('orders').findOne({ order_number: orderNumber }, { projection: { _id: 0 } });
  if (!doc) return res.status(404).json({ detail: 'Order not found' });
  res.json(doc);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ detail: err.message || 'Server error' });
});

async function start() {
  await connectDb();
  await getSettings();
  app.listen(PORT, () => {
    console.log(`Node backend listening on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error('Startup failed:', error);
  process.exit(1);
});
