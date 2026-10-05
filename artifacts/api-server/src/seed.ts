/**
 * Seed script for Fuchsia — Women's Events & Luxury Gifts Platform
 * Run: cd artifacts/api-server && npx tsx src/seed.ts
 */
import { db, pool } from "@workspace/db";
import * as schema from "@workspace/db";
import { sql } from "drizzle-orm";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "fuchsia_salt_2024").digest("hex");
}

async function main() {
  console.log("🌸 Seeding Fuchsia database...");

  // Clear existing data
  await db.execute(sql`TRUNCATE TABLE email_verification_codes, reviews, cart_items, order_items, orders, notifications, notification_channel_settings, products, banners, coupons, favorites, payment_wallets, categories, stores, users RESTART IDENTITY CASCADE`);
  console.log("✓ Cleared existing data");

  // ─── USERS ───────────────────────────────────────────────────────────────
  await db.insert(schema.usersTable).values([
    {
      fullName: "مدير النظام",
      email: "admin@fuchsia.ye",
      passwordHash: hashPassword("admin123"),
      isGuest: false,
      rewardPoints: 1000,
      referralCode: "ADM001",
      phone: "777000001",
      address: "صنعاء، اليمن",
    },
  ]);
  console.log("✓ Users seeded");
  await db.insert(schema.paymentWalletsTable).values([
    { nameAr: "جيب", nameEn: "Jaib", accountNumber: "أضف رقم حساب جيب من لوحة الإدارة", instructions: "حوّل المبلغ ثم أرفق الإيصال", iconUrl: "/payment-wallets/jaib.jpg", sortOrder: 1 },
    { nameAr: "جوالي", nameEn: "Jawali", accountNumber: "أضف رقم حساب جوالي من لوحة الإدارة", instructions: "حوّل المبلغ ثم أرفق الإيصال", iconUrl: "/payment-wallets/jawali.jpg", sortOrder: 2 },
    { nameAr: "موبايل موني", nameEn: "Mobile Money", accountNumber: "أضف رقم حساب موبايل موني من لوحة الإدارة", instructions: "حوّل المبلغ ثم أرفق الإيصال", iconUrl: "/payment-wallets/mobile-money.jpg", sortOrder: 3 },
    { nameAr: "محفظتي", nameEn: "Mahfazati", accountNumber: "أضف رقم الحساب من لوحة الإدارة", instructions: "حوّل المبلغ ثم أرفق الإيصال", iconUrl: "/payment-wallets/mahfazati.jpg", sortOrder: 4 },
    { nameAr: "كاش", nameEn: "Cash", accountNumber: "أضف رقم الحساب من لوحة الإدارة", instructions: "حوّل المبلغ ثم أرفق الإيصال", iconUrl: "/payment-wallets/cash.jpg", sortOrder: 5 },
    { nameAr: "فلوسك", nameEn: "Floosi", accountNumber: "أضف رقم حساب فلوسك من لوحة الإدارة", instructions: "حوّل المبلغ ثم أرفق الإيصال", iconUrl: "/payment-wallets/flousy.jpg", sortOrder: 6 },
  ]);
  console.log("✓ Payment wallets seeded");

  await db.insert(schema.notificationChannelSettingsTable).values([
    { channel: "whatsapp", enabled: true, provider: "WhatsApp Business Cloud API", sender: null, template: "مرحباً {name}، تم تحديث طلبك رقم {order} إلى: {status}." },
    { channel: "email", enabled: true, provider: "Resend", sender: null, template: "مرحباً {name}، تم تحديث طلبك رقم {order} إلى: {status}." },
  ]);
  console.log("✓ Notification channels seeded");


  // ─── CATEGORIES ─────────────────────────────────────────────────────────
  const categories = await db.insert(schema.categoriesTable).values([
    { nameAr: "كوش الأعراس",     nameEn: "Wedding Arches",    icon: "flower-2",  color: "#D81B60", imageUrl: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400&h=400&fit=crop", productCount: 0 },
    { nameAr: "تجهيز الخطوبة",   nameEn: "Engagement Setup",  icon: "diamond",   color: "#F48FB1", imageUrl: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=400&h=400&fit=crop", productCount: 0 },
    { nameAr: "الطاولات",         nameEn: "Tables",            icon: "table",     color: "#E91E8C", imageUrl: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=400&h=400&fit=crop", productCount: 0 },
    { nameAr: "الهدايا الفاخرة",  nameEn: "Luxury Gifts",      icon: "gift",      color: "#C2185B", imageUrl: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=400&fit=crop", productCount: 0 },
    { nameAr: "التغليف الفاخر",   nameEn: "Luxury Wrapping",   icon: "package",   color: "#AD1457", imageUrl: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&h=400&fit=crop", productCount: 0 },
    { nameAr: "الورود والزهور",   nameEn: "Roses & Flowers",   icon: "flower",    color: "#F06292", imageUrl: "https://images.unsplash.com/photo-1487530811015-2780be2b99f6?w=400&h=400&fit=crop", productCount: 0 },
  ]).returning();
  console.log("✓ Categories seeded:", categories.length);

  const [catKosh, catKhitba, catTables, catGifts, catWrapping, catFlowers] = categories;

  // ─── STORES ─────────────────────────────────────────────────────────────
  const stores = await db.insert(schema.storesTable).values([
    {
      nameAr: "أتيلييه فوشيا للكوش",
      nameEn: "Fuchsia Kosh Atelier",
      description: "متخصصون في تصميم كوش الأعراس الملكية والعصرية بأرقى الزهور والديكورات",
      logoUrl: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=200&h=200&fit=crop",
      coverUrl: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&h=300&fit=crop",
      rating: 4.9, reviewCount: 312, isOpen: true,
      workingHours: "٩ صباحاً – ١١ مساءً", phone: "777123456",
      location: "شارع الستين، صنعاء", isFeatured: true, productCount: 0,
    },
    {
      nameAr: "بيت الخطوبة الراقي",
      nameEn: "Elite Engagement House",
      description: "تجهيزات خطوبة فاخرة — صناديق، ورود، شوكولاتة، وإكسسوارات بتغليف ملكي",
      logoUrl: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=200&h=200&fit=crop",
      coverUrl: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=800&h=300&fit=crop",
      rating: 4.8, reviewCount: 245, isOpen: true,
      workingHours: "١٠ صباحاً – ١٠ مساءً", phone: "777654321",
      location: "حي الروضة، صنعاء", isFeatured: true, productCount: 0,
    },
    {
      nameAr: "دار الهدايا الملكية",
      nameEn: "Royal Gifts House",
      description: "هدايا فاخرة مخصصة لكل المناسبات — زواج، تخرج، مواليد، أعياد ميلاد",
      logoUrl: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=200&h=200&fit=crop",
      coverUrl: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&h=300&fit=crop",
      rating: 4.7, reviewCount: 189, isOpen: true,
      workingHours: "٩ صباحاً – ٩ مساءً", phone: "777789012",
      location: "شارع هايل، صنعاء", isFeatured: true, productCount: 0,
    },
    {
      nameAr: "ورشة التغليف الإبداعي",
      nameEn: "Creative Wrapping Studio",
      description: "تغليف احترافي فاخر — أكريليك، ورود طبيعية، ساتان، وتصاميم مخصصة",
      logoUrl: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=200&h=200&fit=crop",
      coverUrl: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&h=300&fit=crop",
      rating: 4.8, reviewCount: 134, isOpen: false,
      workingHours: "١٠ صباحاً – ٨ مساءً", phone: "777345678",
      location: "حي السبعين، صنعاء", isFeatured: false, productCount: 0,
    },
    {
      nameAr: "حديقة الورود والزهور",
      nameEn: "Roses & Flowers Garden",
      description: "أجمل الورود الطازجة والباقات الفاخرة لتزيين المناسبات والهدايا",
      logoUrl: "https://images.unsplash.com/photo-1487530811015-2780be2b99f6?w=200&h=200&fit=crop",
      coverUrl: "https://images.unsplash.com/photo-1487530811015-2780be2b99f6?w=800&h=300&fit=crop",
      rating: 4.9, reviewCount: 278, isOpen: true,
      workingHours: "٨ صباحاً – ١٠ مساءً", phone: "777901234",
      location: "شارع الجمهورية، صنعاء", isFeatured: true, productCount: 0,
    },
  ]).returning();
  console.log("✓ Stores seeded:", stores.length);

  const [sKosh, sKhitba, sGifts, sWrapping, sFlowers] = stores;

  // ─── PRODUCTS ────────────────────────────────────────────────────────────
  const products = await db.insert(schema.productsTable).values([
    // كوش الأعراس
    {
      nameAr: "كوش عرس ملكي بالورود الطبيعية",
      nameEn: "Royal Wedding Arch with Natural Roses",
      description: "كوش زفاف فاخر مزين بأجمل الورود الطبيعية والإضاءة الذهبية، تصميم ملكي لا يُنسى",
      price: 180000, discountPrice: 150000,
      categoryId: catKosh.id, storeId: sKosh.id,
      imageUrl: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400&h=400&fit=crop",
      isFeatured: true, isNew: false, rating: 4.9, reviewCount: 87, deliveryDays: 3,
      tags: JSON.stringify(["ملكي", "فاخر", "ورود طبيعية"]),
      occasionTags: JSON.stringify(["زفاف", "عرس"]),
    },
    {
      nameAr: "كوش عصري بالبالونات والزهور",
      nameEn: "Modern Balloon & Flower Arch",
      description: "كوش عصري أنيق بمزيج من البالونات الفاخرة وزهور المكس، مثالي للأعراس العصرية",
      price: 95000, discountPrice: 80000,
      categoryId: catKosh.id, storeId: sKosh.id,
      imageUrl: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=400&h=400&fit=crop",
      isFeatured: false, isNew: true, rating: 4.7, reviewCount: 54, deliveryDays: 2,
      tags: JSON.stringify(["عصري", "بالونات", "زهور"]),
      occasionTags: JSON.stringify(["زفاف", "عرس"]),
    },
    {
      nameAr: "كوش كلاسيكي أبيض وذهبي",
      nameEn: "Classic White & Gold Arch",
      description: "كوش كلاسيكي راقٍ بألوان الأبيض والذهبي مع الورود البيضاء الناصعة",
      price: 120000,
      categoryId: catKosh.id, storeId: sKosh.id,
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
      isFeatured: true, isNew: false, rating: 4.8, reviewCount: 112, deliveryDays: 3,
      tags: JSON.stringify(["كلاسيكي", "أبيض", "ذهبي"]),
      occasionTags: JSON.stringify(["زفاف", "خطوبة"]),
    },
    // تجهيز الخطوبة
    {
      nameAr: "صندوق خطوبة فاخر ذهبي",
      nameEn: "Luxury Gold Engagement Box",
      description: "صندوق خطوبة ملكي من الأكريليك الذهبي مع ورود حمراء طبيعية وشوكولاتة بلجيكية فاخرة",
      price: 35000, discountPrice: 28000,
      categoryId: catKhitba.id, storeId: sKhitba.id,
      imageUrl: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=400&h=400&fit=crop",
      isFeatured: true, isNew: false, rating: 4.9, reviewCount: 203, deliveryDays: 1,
      tags: JSON.stringify(["أكريليك", "ذهبي", "ورود", "شوكولاتة"]),
      occasionTags: JSON.stringify(["خطوبة"]),
    },
    {
      nameAr: "بوكيه ورود خطوبة مع هدية",
      nameEn: "Engagement Rose Bouquet with Gift",
      description: "باقة ورود حمراء فاخرة مع هدية مميزة وتغليف ساتان ملكي، لتجربة خطوبة لا تُنسى",
      price: 18000, discountPrice: 14000,
      categoryId: catKhitba.id, storeId: sKhitba.id,
      imageUrl: "https://images.unsplash.com/photo-1487530811015-2780be2b99f6?w=400&h=400&fit=crop",
      isFeatured: false, isNew: true, rating: 4.8, reviewCount: 156, deliveryDays: 1,
      tags: JSON.stringify(["ورود", "باقة", "هدية"]),
      occasionTags: JSON.stringify(["خطوبة"]),
    },
    {
      nameAr: "طقم خطوبة كامل بالشمع",
      nameEn: "Complete Engagement Set with Candles",
      description: "طقم خطوبة متكامل: شمعة فاخرة، عطر، شوكولاتة، ورود، في صندوق ملكي مخصص",
      price: 55000, discountPrice: 45000,
      categoryId: catKhitba.id, storeId: sKhitba.id,
      imageUrl: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=400&fit=crop",
      isFeatured: true, isNew: false, rating: 4.7, reviewCount: 98, deliveryDays: 2,
      tags: JSON.stringify(["شمعة", "عطر", "شوكولاتة"]),
      occasionTags: JSON.stringify(["خطوبة", "زفاف"]),
    },
    // الطاولات
    {
      nameAr: "تجهيز طاولة عرس ملكية",
      nameEn: "Royal Wedding Table Setup",
      description: "تجهيز طاولة الشرف بديكورات الورود وإضاءة LED وأفخر الإكسسوارات الملكية",
      price: 65000, discountPrice: 55000,
      categoryId: catTables.id, storeId: sKosh.id,
      imageUrl: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=400&h=400&fit=crop",
      isFeatured: true, isNew: false, rating: 4.8, reviewCount: 67, deliveryDays: 2,
      tags: JSON.stringify(["طاولة عرس", "LED", "ملكي"]),
      occasionTags: JSON.stringify(["زفاف"]),
    },
    {
      nameAr: "طاولة ضيافة فاخرة",
      nameEn: "Luxury Hospitality Table",
      description: "تجهيز طاولة ضيافة راقية بأواني الكريستال والزهور الطازجة وأدوات المائدة الذهبية",
      price: 42000,
      categoryId: catTables.id, storeId: sKosh.id,
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
      isFeatured: false, isNew: true, rating: 4.6, reviewCount: 43, deliveryDays: 2,
      tags: JSON.stringify(["ضيافة", "كريستال", "ذهبي"]),
      occasionTags: JSON.stringify(["زفاف", "خطوبة", "ضيافة"]),
    },
    // الهدايا الفاخرة
    {
      nameAr: "بوكس هدايا زواج فاخر",
      nameEn: "Luxury Wedding Gift Box",
      description: "صندوق هدايا زواج مخصص يحتوي على عطر، شمعة، ورود محفوظة، وبطاقة بالاسم",
      price: 28000, discountPrice: 22000,
      categoryId: catGifts.id, storeId: sGifts.id,
      imageUrl: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=400&fit=crop",
      isFeatured: true, isNew: false, rating: 4.9, reviewCount: 234, deliveryDays: 1,
      tags: JSON.stringify(["زواج", "مخصص", "عطر"]),
      occasionTags: JSON.stringify(["زفاف", "زواج"]),
    },
    {
      nameAr: "هدية تخرج مع إطار شهادة",
      nameEn: "Graduation Gift with Certificate Frame",
      description: "هدية تخرج أنيقة: إطار شهادة ذهبي + باقة ورود + شوكولاتة فاخرة في صندوق مميز",
      price: 22000, discountPrice: 18000,
      categoryId: catGifts.id, storeId: sGifts.id,
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
      isFeatured: false, isNew: true, rating: 4.7, reviewCount: 89, deliveryDays: 1,
      tags: JSON.stringify(["تخرج", "إطار", "شوكولاتة"]),
      occasionTags: JSON.stringify(["تخرج"]),
    },
    {
      nameAr: "بوكس مواليد للمولود الجديد",
      nameEn: "Newborn Baby Gift Box",
      description: "صندوق مواليد رائع للاحتفاء بالمولود الجديد، يشمل ملابس، هدايا، وشموع احتفالية",
      price: 32000, discountPrice: 26000,
      categoryId: catGifts.id, storeId: sGifts.id,
      imageUrl: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&h=400&fit=crop",
      isFeatured: true, isNew: false, rating: 4.8, reviewCount: 178, deliveryDays: 1,
      tags: JSON.stringify(["مواليد", "أطفال", "احتفال"]),
      occasionTags: JSON.stringify(["مواليد"]),
    },
    // التغليف الفاخر
    {
      nameAr: "تغليف فاخر بالورود الطبيعية",
      nameEn: "Luxury Natural Rose Wrapping",
      description: "تغليف هدايا احترافي بالورود الطبيعية الطازجة والشريط الساتاني الملكي",
      price: 8500, discountPrice: 7000,
      categoryId: catWrapping.id, storeId: sWrapping.id,
      imageUrl: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&h=400&fit=crop",
      isFeatured: true, isNew: false, rating: 4.9, reviewCount: 145, deliveryDays: 1,
      tags: JSON.stringify(["ورود طبيعية", "ساتان", "فاخر"]),
      occasionTags: JSON.stringify(["زفاف", "خطوبة", "هدية"]),
    },
    {
      nameAr: "صندوق أكريليك مع إضاءة LED",
      nameEn: "Acrylic Box with LED Lights",
      description: "صندوق أكريليك شفاف فاخر مع إضاءة LED داخلية يضيء محتوياتك بشكل ساحر",
      price: 12000,
      categoryId: catWrapping.id, storeId: sWrapping.id,
      imageUrl: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=400&fit=crop",
      isFeatured: false, isNew: true, rating: 4.7, reviewCount: 67, deliveryDays: 1,
      tags: JSON.stringify(["أكريليك", "LED", "شفاف"]),
      occasionTags: JSON.stringify(["خطوبة", "هدية"]),
    },
    // الورود والزهور
    {
      nameAr: "باقة ورود حمراء فاخرة ١٠٠ وردة",
      nameEn: "Luxury 100 Red Roses Bouquet",
      description: "باقة فاخرة من ١٠٠ وردة حمراء طبيعية طازجة، مثالية للمناسبات الرومانسية",
      price: 25000, discountPrice: 20000,
      categoryId: catFlowers.id, storeId: sFlowers.id,
      imageUrl: "https://images.unsplash.com/photo-1487530811015-2780be2b99f6?w=400&h=400&fit=crop",
      isFeatured: true, isNew: false, rating: 4.9, reviewCount: 312, deliveryDays: 1,
      tags: JSON.stringify(["ورود حمراء", "١٠٠ وردة", "طبيعية"]),
      occasionTags: JSON.stringify(["زفاف", "خطوبة", "عيد الحب"]),
    },
    {
      nameAr: "تنسيق زهور المكان الاحتفالي",
      nameEn: "Venue Flower Arrangement",
      description: "تنسيق زهوري شامل للمكان الاحتفالي — طاولات، كراسي، ممرات وأقواس",
      price: 95000, discountPrice: 80000,
      categoryId: catFlowers.id, storeId: sFlowers.id,
      imageUrl: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400&h=400&fit=crop",
      isFeatured: true, isNew: false, rating: 4.8, reviewCount: 156, deliveryDays: 2,
      tags: JSON.stringify(["تنسيق", "زهور", "شامل"]),
      occasionTags: JSON.stringify(["زفاف", "خطوبة"]),
    },
  ]).returning();
  console.log("✓ Products seeded:", products.length);

  // Update counts
  for (const cat of categories) {
    const count = products.filter(p => p.categoryId === cat.id).length;
    await db.execute(sql`UPDATE categories SET product_count = ${count} WHERE id = ${cat.id}`);
  }
  for (const store of stores) {
    const count = products.filter(p => p.storeId === store.id).length;
    await db.execute(sql`UPDATE stores SET product_count = ${count} WHERE id = ${store.id}`);
  }
  console.log("✓ Counts updated");

  // ─── BANNERS ─────────────────────────────────────────────────────────────
  await db.insert(schema.bannersTable).values([
    {
      title: "كوش أعراسك الأسطوري",
      subtitle: "نصمم لكِ كوش أحلامك بأرقى الورود والديكورات الملكية",
      imageUrl: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&h=300&fit=crop",
      linkType: "category", linkId: catKosh.id, isActive: true, sortOrder: 1,
    },
    {
      title: "تجهيزات الخطوبة الملكية",
      subtitle: "صناديق خطوبة وهدايا فاخرة لأجمل لحظات حياتك",
      imageUrl: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=800&h=300&fit=crop",
      linkType: "category", linkId: catKhitba.id, isActive: true, sortOrder: 2,
    },
    {
      title: "هدايا لكل مناسبة",
      subtitle: "زواج، تخرج، مواليد — اخترِي هديتكِ المميزة",
      imageUrl: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&h=300&fit=crop",
      linkType: "category", linkId: catGifts.id, isActive: true, sortOrder: 3,
    },
  ]);
  console.log("✓ Banners seeded");

  // ─── COUPONS ─────────────────────────────────────────────────────────────
  await db.insert(schema.couponsTable).values([
    { code: "FUCHSIA10", discountType: "percentage", discountValue: 10, minCartTotal: 20000, isActive: true },
    { code: "WELCOME20", discountType: "percentage", discountValue: 20, minCartTotal: 50000, isActive: true },
    { code: "KOSH50",    discountType: "fixed",      discountValue: 5000, minCartTotal: 80000, isActive: true },
  ]);
  console.log("✓ Coupons seeded");

  console.log("\n✅ Fuchsia database seeded successfully!");
  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
