import { MongoClient } from 'mongodb';
import { MONGO_URL, DB_NAME, DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD } from './config.js';
import { defaultSettings, collectionsSeed, productsSeed, couponsSeed, genId, hashPassword, nowIso, buildProduct } from './utils.js';

const client = new MongoClient(MONGO_URL);

async function seed() {
  await client.connect();
  const db = client.db(DB_NAME);

  const collectionsCount = await db.collection('collections').countDocuments();
  if (collectionsCount === 0) {
    await db.collection('collections').insertMany(collectionsSeed);
    console.log('Inserted collections');
  } else {
    console.log('Collections already exist; skipping insert');
  }

  const productsCount = await db.collection('products').countDocuments();
  if (productsCount === 0) {
    const collectionsBySlug = {};
    const collections = await db.collection('collections').find({}).toArray();
    collections.forEach((collection) => {
      collectionsBySlug[collection.slug] = collection;
    });

    const products = productsSeed.map(({ data }) => {
      const collection = collectionsBySlug[data.collection];
      return collection ? buildProduct(data, collection) : null;
    }).filter(Boolean);

    if (products.length > 0) {
      await db.collection('products').insertMany(products);
      console.log('Inserted products');
    }
  } else {
    console.log('Products already exist; skipping insert');
  }

  const couponsCount = await db.collection('coupons').countDocuments();
  if (couponsCount === 0) {
    await db.collection('coupons').insertMany(couponsSeed);
    console.log('Inserted coupons');
  } else {
    console.log('Coupons already exist; skipping insert');
  }

  const settings = await db.collection('settings').findOne({ id: 'global' });
  if (!settings) {
    await db.collection('settings').insertOne(defaultSettings);
    console.log('Inserted default settings');
  } else {
    console.log('Settings already exist; skipping insert');
  }

  const adminEmail = DEFAULT_ADMIN_EMAIL.toLowerCase();
  const existingAdmin = await db.collection('admins').findOne({ email: adminEmail });
  if (!existingAdmin) {
    await db.collection('admins').insertOne({
      id: genId(),
      email: adminEmail,
      password_hash: await hashPassword(DEFAULT_ADMIN_PASSWORD),
      created_at: nowIso(),
      updated_at: nowIso(),
    });
    console.log(`Inserted default admin: ${adminEmail}`);
  } else {
    console.log('Admin user already exists; skipping insert');
  }

  await client.close();
  console.log('Seed complete');
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
