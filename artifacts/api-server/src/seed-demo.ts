import { and, eq } from "drizzle-orm";
import {
  db,
  pool,
  categoriesTable,
  productsTable,
  storesTable,
  usersTable,
  venueAvailabilityTable,
  venueBookingEventsTable,
  venueBookingsTable,
  venueOwnersTable,
  venuesTable,
} from "@workspace/db";

const demoEnvironment = (process.env.FUCHSIA_DATABASE_ENV || "").toLowerCase();
const databaseUrl = process.env.DATABASE_URL || "";
const connectionDatabaseName = (() => {
  try { return decodeURIComponent(new URL(databaseUrl).pathname.replace(/^\//, "").split("/")[0] || ""); }
  catch { return ""; }
})();
const declaredDatabaseName = process.env.FUCHSIA_DATABASE_NAME || process.env.MYSQL_DATABASE || "";
const databaseName = connectionDatabaseName || declaredDatabaseName;
const explicitConfirmation = process.env.FUCHSIA_DEMO_SEED_CONFIRM;

if (!new Set(["development", "test", "staging"]).has(demoEnvironment)
  || (connectionDatabaseName && declaredDatabaseName && connectionDatabaseName.toLowerCase() !== declaredDatabaseName.toLowerCase())
  || !/(demo|staging|dev|test)/i.test(databaseName)
  || /prod/i.test(databaseName)
  || explicitConfirmation !== "SEED_DEMO_ONLY") {
  throw new Error(
    "رفض زرع بيانات المعاينة: يلزم FUCHSIA_DATABASE_ENV=development|test|staging، "
    + "واسم قاعدة بيانات يتضمن demo/dev/test/staging، وFUCHSIA_DEMO_SEED_CONFIRM=SEED_DEMO_ONLY. "
    + "لا تستخدم هذا السكربت على قاعدة الإنتاج.",
  );
}

const DEMO_USER_EMAIL = "demo-venue-owner@fuchsia.example";
const DEMO_STORE_NAME = "[معاينة] متجر الكوش والطاولات";
const DEMO_PHONE = "0000000000";

const venueFixtures = [
  {
    nameAr: "[معاينة] قاعة النخبة للأعراس",
    description: "قاعة تجريبية لمعاينة عرض التفاصيل والحجز. هذه بيانات اختبار وليست إعلانًا حقيقيًا.",
    audienceScope: "both",
    capacity: 260,
    dailyPrice: 250000,
    address: "شارع الستين — عنوان معاينة، صنعاء",
    image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&h=800&fit=crop",
    amenities: ["مواقف سيارات", "قاعة نسائية", "قاعة رجالية", "تكييف"],
    rules: "بيانات معاينة فقط. يُرجى عدم التواصل أو تحويل مبالغ.",
  },
  {
    nameAr: "[معاينة] قصر اللؤلؤة — قسم النساء",
    description: "مثال لقصر مناسبات نسائي مع مساحة استقبال ومنصة عروس. بيانات معاينة غير فعلية.",
    audienceScope: "women",
    capacity: 340,
    dailyPrice: 380000,
    address: "حي حدة — عنوان معاينة، صنعاء",
    image: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&h=800&fit=crop",
    amenities: ["قاعة نسائية", "منصة عروس", "غرفة تجهيز", "تكييف"],
    rules: "بيانات معاينة فقط. يُرجى عدم التواصل أو تحويل مبالغ.",
  },
  {
    nameAr: "[معاينة] قاعة السمو — قسم الرجال",
    description: "مثال لقاعة مناسبات رجالية واسعة مع مجلس استقبال. بيانات معاينة غير فعلية.",
    audienceScope: "men",
    capacity: 300,
    dailyPrice: 220000,
    address: "شارع حدة — عنوان معاينة، صنعاء",
    image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&h=800&fit=crop",
    amenities: ["قاعة رجالية", "مجلس استقبال", "مواقف سيارات"],
    rules: "بيانات معاينة فقط. يُرجى عدم التواصل أو تحويل مبالغ.",
  },
  {
    nameAr: "[معاينة] قاعة ليالي صنعاء",
    description: "مثال لقاعة متعددة الأقسام قابلة لاختيار قسم النساء أو الرجال عند الحجز.",
    audienceScope: "both",
    capacity: 420,
    dailyPrice: 450000,
    address: "شارع الخمسين — عنوان معاينة، صنعاء",
    image: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&h=800&fit=crop",
    amenities: ["قسم نساء", "قسم رجال", "مسرح", "مواقف سيارات"],
    rules: "بيانات معاينة فقط. يُرجى عدم التواصل أو تحويل مبالغ.",
  },
  {
    nameAr: "[معاينة] قاعة وردة صنعاء — نسائية",
    description: "مثال لقاعة نسائية بتصميم هادئ وتجهيزات حفلات متكاملة. بيانات معاينة غير فعلية.",
    audienceScope: "women",
    capacity: 180,
    dailyPrice: 195000,
    address: "حي الروضة — عنوان معاينة، صنعاء",
    image: "https://images.unsplash.com/photo-1465495976277-4387d4b0e4a6?w=1200&h=800&fit=crop",
    amenities: ["قاعة نسائية", "منصة", "غرفة تجهيز"],
    rules: "بيانات معاينة فقط. يُرجى عدم التواصل أو تحويل مبالغ.",
  },
] as const;

const rentalFixtures = [
  {
    nameAr: "[معاينة] كوشة زفاف ملكية — نسائية",
    description: "كوشة نسائية مزينة بالورود والإضاءة. يُدخل المالك الصور والسعر والكمية الفعلية عند النشر الحقيقي.",
    rentalCategory: "kosh",
    eventAudience: "women",
    dailyPrice: 55000,
    deposit: 30000,
    stockQuantity: 1,
    image: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&h=900&fit=crop",
    colors: ["أبيض", "ذهبي", "وردي"],
    height: null,
  },
  {
    nameAr: "[معاينة] كوشة عرس رجالية — تصميم ملكي",
    description: "كوشة رجالية بتصميم رسمي وألوان هادئة. بيانات العنصر والأسعار هنا للمعاينة فقط.",
    rentalCategory: "kosh",
    eventAudience: "men",
    dailyPrice: 48000,
    deposit: 25000,
    stockQuantity: 1,
    image: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&h=900&fit=crop",
    colors: ["أبيض", "ذهبي", "كحلي"],
    height: null,
  },
  {
    nameAr: "[معاينة] كوشة عروسين — تناسب القسمين",
    description: "مثال لمنتج يتيحه صاحبه للقسمين، مع صور وسعر إيجار يومي وتأمين واضح.",
    rentalCategory: "kosh",
    eventAudience: "both",
    dailyPrice: 62000,
    deposit: 35000,
    stockQuantity: 1,
    image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&h=900&fit=crop",
    colors: ["أبيض", "ذهبي"],
    height: null,
  },
  {
    nameAr: "[معاينة] طاولات دائرية للمناسبات",
    description: "طاولات دائرية قابلة للتأجير بعدد القطع المتاح، مع اختيار اللون قبل إرسال الحجز.",
    rentalCategory: "table",
    eventAudience: "both",
    dailyPrice: 4500,
    deposit: 1500,
    stockQuantity: 18,
    image: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&h=900&fit=crop",
    colors: ["أبيض", "ذهبي", "وردي"],
    height: 75,
  },
  {
    nameAr: "[معاينة] طاولات ضيافة مستطيلة",
    description: "مثال لطاولات ضيافة مع ارتفاع ومخزون وألوان يضيفها المالك.",
    rentalCategory: "table",
    eventAudience: "women",
    dailyPrice: 6000,
    deposit: 2000,
    stockQuantity: 10,
    image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&h=900&fit=crop",
    colors: ["أبيض", "ذهبي"],
    height: 90,
  },
  {
    nameAr: "[معاينة] طاولة مناسبات عالية",
    description: "طاولة عالية للمناسبات والاستقبال، مع صور وألوان متاحة في صفحة التفاصيل.",
    rentalCategory: "table",
    eventAudience: "men",
    dailyPrice: 5000,
    deposit: 1800,
    stockQuantity: 8,
    image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&h=900&fit=crop",
    colors: ["أسود", "ذهبي", "خشبي"],
    height: 105,
  },
] as const;

function dateAfter(days: number): string {
  const date = new Date();
  date.setUTCHours(18, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  while (date.getUTCDay() === 0) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

async function main() {
  console.log(`Seeding demo fixtures into explicitly selected non-production database: ${databaseName}`);

  let [demoUser] = await db.select().from(usersTable).where(eq(usersTable.email, DEMO_USER_EMAIL)).limit(1);
  if (!demoUser) {
    await db.insert(usersTable).values({
      fullName: "مالك معاينة — لا يستخدم للحجوزات الحقيقية",
      email: DEMO_USER_EMAIL,
      passwordHash: null,
      phone: DEMO_PHONE,
      isGuest: true,
      rewardPoints: 0,
      referralCode: null,
    });
    [demoUser] = await db.select().from(usersTable).where(eq(usersTable.email, DEMO_USER_EMAIL)).limit(1);
  }
  if (!demoUser) throw new Error("Could not create the demo owner account");

  let [demoOwner] = await db.select().from(venueOwnersTable).where(eq(venueOwnersTable.userId, demoUser.id)).limit(1);
  if (!demoOwner) {
    await db.insert(venueOwnersTable).values({
      userId: demoUser.id,
      businessName: "[معاينة] مالك القاعات والكوش والطاولات",
      contactPhone: DEMO_PHONE,
      status: "active",
    });
    [demoOwner] = await db.select().from(venueOwnersTable).where(eq(venueOwnersTable.userId, demoUser.id)).limit(1);
  } else {
    await db.update(venueOwnersTable).set({
      businessName: "[معاينة] مالك القاعات والكوش والطاولات",
      contactPhone: DEMO_PHONE,
      status: "active",
    }).where(eq(venueOwnersTable.id, demoOwner.id));
  }
  if (!demoOwner) throw new Error("Could not create the demo venue owner");

  async function ensureCategory(nameAr: string, nameEn: string, icon: string, imageUrl: string) {
    let [category] = await db.select().from(categoriesTable).where(eq(categoriesTable.nameAr, nameAr)).limit(1);
    if (!category) {
      await db.insert(categoriesTable).values({ nameAr, nameEn, icon, color: "#B20A4B", imageUrl, productCount: 0 });
      [category] = await db.select().from(categoriesTable).where(eq(categoriesTable.nameAr, nameAr)).limit(1);
    }
    if (!category) throw new Error(`Could not create category: ${nameAr}`);
    return category;
  }

  const koshCategory = await ensureCategory(
    "كوش الأعراس", "Wedding Arches", "chair-5", "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400&h=400&fit=crop",
  );
  const tableCategory = await ensureCategory(
    "الطاولات", "Event Tables", "table", "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=400&h=400&fit=crop",
  );

  let [demoStore] = await db.select().from(storesTable).where(eq(storesTable.nameAr, DEMO_STORE_NAME)).limit(1);
  const storeValues = {
    nameAr: DEMO_STORE_NAME,
    nameEn: "Fuchsia Demo Rental Store",
    description: "كتالوج معاينة للكوش والطاولات. هذه ليست عروضًا تجارية فعلية.",
    logoUrl: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=300&h=300&fit=crop",
    coverUrl: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&h=500&fit=crop",
    rating: 0,
    reviewCount: 0,
    isOpen: true,
    workingHours: "بيانات معاينة",
    phone: DEMO_PHONE,
    location: "صنعاء — بيانات معاينة",
    ownerUserId: demoUser.id,
    isFeatured: false,
  };
  if (!demoStore) {
    await db.insert(storesTable).values({ ...storeValues, productCount: 0 });
    [demoStore] = await db.select().from(storesTable).where(eq(storesTable.nameAr, DEMO_STORE_NAME)).limit(1);
  } else {
    await db.update(storesTable).set(storeValues).where(eq(storesTable.id, demoStore.id));
    [demoStore] = await db.select().from(storesTable).where(eq(storesTable.id, demoStore.id)).limit(1);
  }
  if (!demoStore) throw new Error("Could not create the demo rental store");

  const venueIds: number[] = [];
  for (const fixture of venueFixtures) {
    const values = {
      ownerId: demoOwner.id,
      nameAr: fixture.nameAr,
      description: fixture.description,
      city: "صنعاء — معاينة",
      address: fixture.address,
      capacity: fixture.capacity,
      dailyPrice: fixture.dailyPrice,
      audienceScope: fixture.audienceScope,
      primaryImageUrl: fixture.image,
      images: JSON.stringify([fixture.image]),
      amenities: JSON.stringify(fixture.amenities),
      rules: fixture.rules,
      isPublished: true,
      rating: 0,
      reviewCount: 0,
    };
    let [venue] = await db.select().from(venuesTable).where(and(eq(venuesTable.ownerId, demoOwner.id), eq(venuesTable.nameAr, fixture.nameAr))).limit(1);
    if (!venue) {
      await db.insert(venuesTable).values(values);
      [venue] = await db.select().from(venuesTable).where(and(eq(venuesTable.ownerId, demoOwner.id), eq(venuesTable.nameAr, fixture.nameAr))).limit(1);
    } else {
      await db.update(venuesTable).set(values).where(eq(venuesTable.id, venue.id));
      [venue] = await db.select().from(venuesTable).where(eq(venuesTable.id, venue.id)).limit(1);
    }
    if (!venue) throw new Error(`Could not create demo venue: ${fixture.nameAr}`);
    venueIds.push(venue.id);

    const scopes = fixture.audienceScope === "both" ? ["women", "men"] : [fixture.audienceScope];
    for (const scope of scopes) {
      for (let weekDay = 0; weekDay < 7; weekDay += 1) {
        const isOpen = weekDay !== 0;
        const [slot] = await db.select().from(venueAvailabilityTable).where(and(
          eq(venueAvailabilityTable.venueId, venue.id),
          eq(venueAvailabilityTable.audienceScope, scope),
          eq(venueAvailabilityTable.weekDay, weekDay),
          eq(venueAvailabilityTable.period, "all_day"),
        )).limit(1);
        if (slot) {
          await db.update(venueAvailabilityTable).set({ isOpen }).where(eq(venueAvailabilityTable.id, slot.id));
        } else {
          await db.insert(venueAvailabilityTable).values({
            venueId: venue.id,
            audienceScope: scope,
            weekDay,
            period: "all_day",
            isOpen,
          });
        }
      }
    }
  }

  for (const fixture of rentalFixtures) {
    const categoryId = fixture.rentalCategory === "kosh" ? koshCategory.id : tableCategory.id;
    const values = {
      nameAr: fixture.nameAr,
      nameEn: null,
      description: fixture.description,
      price: fixture.dailyPrice,
      discountPrice: null,
      fulfillmentType: "rental",
      rentalCategory: fixture.rentalCategory,
      eventAudience: fixture.eventAudience,
      tableHeightCm: fixture.height,
      availableColors: JSON.stringify(fixture.colors),
      rentalDailyPrice: fixture.dailyPrice,
      rentalDeposit: fixture.deposit,
      rentalMinDays: 1,
      rentalMaxDays: 3,
      categoryId,
      storeId: demoStore.id,
      imageUrl: fixture.image,
      images: JSON.stringify([fixture.image]),
      inStock: true,
      stockQuantity: fixture.stockQuantity,
      isPublished: true,
      rating: 0,
      reviewCount: 0,
      isFeatured: false,
      isNew: true,
      deliveryDays: 1,
      tags: JSON.stringify(["معاينة", fixture.rentalCategory === "kosh" ? "كوشة" : "طاولات"]),
      occasionTags: JSON.stringify(["زفاف", "مناسبات"]),
      views: 0,
      salesCount: 0,
    };
    let [product] = await db.select().from(productsTable).where(and(eq(productsTable.storeId, demoStore.id), eq(productsTable.nameAr, fixture.nameAr))).limit(1);
    if (!product) {
      await db.insert(productsTable).values(values);
    } else {
      await db.update(productsTable).set(values).where(eq(productsTable.id, product.id));
    }
  }

  await db.update(storesTable).set({ productCount: rentalFixtures.length }).where(eq(storesTable.id, demoStore.id));

  const demoBookings = [
    { venueIndex: 0, daysAhead: 14, days: 1, audience: "women", status: "confirmed" },
    { venueIndex: 1, daysAhead: 21, days: 2, audience: "women", status: "pending" },
    { venueIndex: 2, daysAhead: 28, days: 1, audience: "men", status: "confirmed" },
    { venueIndex: 3, daysAhead: 36, days: 2, audience: "men", status: "confirmed" },
  ] as const;
  for (const fixture of demoBookings) {
    const venueId = venueIds[fixture.venueIndex];
    const [venue] = await db.select().from(venuesTable).where(eq(venuesTable.id, venueId)).limit(1);
    if (!venue) throw new Error(`Demo venue missing at index ${fixture.venueIndex}`);
    const date = dateAfter(fixture.daysAhead);
    const dateKey = `demo-venue-${venueId}-${fixture.audience}`;
    const reservationAt = new Date(`${date}T18:00:00.000Z`);
    const expiresAt = fixture.status === "pending" ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;
    const bookingValues = {
      venueId,
      customerUserId: demoUser.id,
      audience: fixture.audience,
      reservationAt,
      bookingDays: fixture.days,
      partySize: Math.min(40, venue.capacity),
      customerName: "حجز معاينة — ليس حجزًا حقيقيًا",
      customerPhone: DEMO_PHONE,
      dailyPriceSnapshot: venue.dailyPrice,
      totalAmount: venue.dailyPrice * fixture.days,
      paymentType: "deposit",
      paymentAmount: 0,
      platformFee: 1000,
      paymentWalletId: null,
      transactionReference: "DEMO-ONLY-NO-PAYMENT",
      paymentReceiptUrl: null,
      paymentStatus: "demo_only",
      status: fixture.status,
      idempotencyKey: dateKey,
      expiresAt,
      notes: "DEMO ONLY — سجل معاينة مولّد للاختبار. لا يوجد عميل أو دفع حقيقي.",
    };
    let [booking] = await db.select().from(venueBookingsTable).where(eq(venueBookingsTable.idempotencyKey, dateKey)).limit(1);
    if (!booking) {
      await db.insert(venueBookingsTable).values(bookingValues);
      [booking] = await db.select().from(venueBookingsTable).where(eq(venueBookingsTable.idempotencyKey, dateKey)).limit(1);
    } else {
      await db.update(venueBookingsTable).set(bookingValues).where(eq(venueBookingsTable.id, booking.id));
      [booking] = await db.select().from(venueBookingsTable).where(eq(venueBookingsTable.id, booking.id)).limit(1);
    }
    if (booking) {
      const [event] = await db.select().from(venueBookingEventsTable).where(and(
        eq(venueBookingEventsTable.bookingId, booking.id),
        eq(venueBookingEventsTable.eventType, "demo_fixture_seeded"),
      )).limit(1);
      if (!event) {
        await db.insert(venueBookingEventsTable).values({
          bookingId: booking.id,
          actorUserId: demoUser.id,
          actorType: "system",
          eventType: "demo_fixture_seeded",
          toStatus: fixture.status,
          notes: "DEMO ONLY — لا يمثل حجزًا فعليًا.",
        });
      }
    }
  }

  console.log(`✓ Demo venues: ${venueFixtures.length}`);
  console.log(`✓ Demo rental products: ${rentalFixtures.length}`);
  console.log(`✓ Demo calendar reservations: ${demoBookings.length}`);
  console.log("✓ No tables were truncated and no customer or business records were deleted.");
}

main()
  .catch((error) => {
    console.error("Demo seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => { await pool.end(); });
