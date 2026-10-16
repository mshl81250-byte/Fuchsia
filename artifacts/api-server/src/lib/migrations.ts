import { pool } from "@workspace/db";
import { logger } from "./logger";

const COMMERCE_MIGRATION_ID = "20261006_reservations_and_order_tracking_v2";
const ADDRESS_MIGRATION_ID = "20261006_customer_addresses_v1";
const RENTAL_MIGRATION_ID = "20261007_sale_and_rental_products_v1";
const RENTAL_DEPOSIT_MIGRATION_ID = "20261007_rental_deposit_settlement_v1";
const WALLET_TRANSACTIONS_MIGRATION_ID = "20261007_wallet_transactions_v1";
const VENUE_PAYMENT_MIGRATION_ID = "20261007_venue_reservation_payments_v1";
const VENUE_DURATION_MIGRATION_ID = "20261007_venue_booking_duration_v1";
const RENTAL_HANDOVER_MIGRATION_ID = "20261007_rental_handover_plan_v1";
const REAL_VENUE_CATALOG_MIGRATION_ID = "20261007_real_venue_owner_catalog_v1";
const DIRECT_RENTAL_BOOKING_MIGRATION_ID = "20261007_direct_rental_booking_v1";
const PARTNER_OPERATIONS_PHASE3_MIGRATION_ID = "20261009_partner_operations_phase3_v1";
const PARTNER_ACCOUNTS_MIGRATION_ID = "20261015_partner_accounts_permissions_v1";
const RENTAL_DIMENSIONS_MIGRATION_ID = "20261015_rental_product_dimensions_v1";
const PRODUCT_IMAGES_LIMIT_MIGRATION_ID = "20261016_product_images_limit_v1";

async function addColumnIfMissing(tableName: string, columnName: string, definition: string): Promise<void> {
  const [rows] = await pool.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [tableName, columnName],
  );
  if ((rows as Array<{ COLUMN_NAME: string }>).length === 0) {
    await pool.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
  }
}

/** Additive, idempotent schema preparation. Existing customer and commerce data is preserved. */
export async function runMigrations(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fuchsia_schema_migrations (
      migration_id VARCHAR(160) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [rentalDimensionsRows] = await pool.query(
    "SELECT migration_id FROM fuchsia_schema_migrations WHERE migration_id = ? LIMIT 1",
    [RENTAL_DIMENSIONS_MIGRATION_ID],
  );
  if ((rentalDimensionsRows as Array<{ migration_id: string }>).length === 0) {
    await addColumnIfMissing("products", "table_width_cm", "DOUBLE NULL");
    await addColumnIfMissing("products", "table_length_cm", "DOUBLE NULL");
    await addColumnIfMissing("products", "table_diameter_cm", "DOUBLE NULL");
    await addColumnIfMissing("products", "table_seats", "INT NULL");
    await addColumnIfMissing("products", "setup_notes", "TEXT NULL");
    await pool.query("INSERT IGNORE INTO fuchsia_schema_migrations (migration_id) VALUES (?)", [RENTAL_DIMENSIONS_MIGRATION_ID]);
    logger.info({ migrationId: RENTAL_DIMENSIONS_MIGRATION_ID }, "Rental product dimensions migration completed");
  }

  const [productImagesRows] = await pool.query(
    "SELECT migration_id FROM fuchsia_schema_migrations WHERE migration_id = ? LIMIT 1",
    [PRODUCT_IMAGES_LIMIT_MIGRATION_ID],
  );
  if ((productImagesRows as Array<{ migration_id: string }>).length === 0) {
    await pool.query("ALTER TABLE products MODIFY COLUMN images VARCHAR(8000) NOT NULL DEFAULT '[]'");
    await pool.query("INSERT IGNORE INTO fuchsia_schema_migrations (migration_id) VALUES (?)", [PRODUCT_IMAGES_LIMIT_MIGRATION_ID]);
    logger.info({ migrationId: PRODUCT_IMAGES_LIMIT_MIGRATION_ID }, "Product image list capacity migration completed");
  }

  const [commerceRows] = await pool.query(
    "SELECT migration_id FROM fuchsia_schema_migrations WHERE migration_id = ? LIMIT 1",
    [COMMERCE_MIGRATION_ID],
  );
  if ((commerceRows as Array<{ migration_id: string }>).length === 0) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS table_reservations (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        session_id TEXT NOT NULL,
        user_id INT NULL,
        store_id INT NOT NULL,
        reservation_at TIMESTAMP NOT NULL,
        party_size INT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        occasion TEXT NULL,
        notes TEXT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX table_reservations_store_at_idx (store_id, reservation_at),
        INDEX table_reservations_status_at_idx (status, reservation_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_status_events (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        status VARCHAR(64) NOT NULL,
        message TEXT NOT NULL,
        actor_type VARCHAR(32) NOT NULL DEFAULT 'system',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX order_status_events_order_created_idx (order_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token_hash VARCHAR(64) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE INDEX user_sessions_token_hash_uq (token_hash),
        INDEX user_sessions_user_idx (user_id),
        INDEX user_sessions_expiry_idx (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await pool.query(`
      INSERT INTO order_status_events (order_id, status, message, actor_type, created_at)
      SELECT o.id, o.status, 'تم استلام الطلب.', 'system', o.created_at
      FROM orders o
      WHERE NOT EXISTS (
        SELECT 1 FROM order_status_events e WHERE e.order_id = o.id
      )
    `);

    await pool.query("INSERT IGNORE INTO fuchsia_schema_migrations (migration_id) VALUES (?)", [COMMERCE_MIGRATION_ID]);
    logger.info({ migrationId: COMMERCE_MIGRATION_ID }, "Commerce migration completed");
  }

  const [addressRows] = await pool.query(
    "SELECT migration_id FROM fuchsia_schema_migrations WHERE migration_id = ? LIMIT 1",
    [ADDRESS_MIGRATION_ID],
  );
  if ((addressRows as Array<{ migration_id: string }>).length === 0) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_addresses (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        label VARCHAR(80) NOT NULL DEFAULT 'المنزل',
        recipient_name VARCHAR(120) NOT NULL,
        phone VARCHAR(40) NOT NULL,
        address TEXT NOT NULL,
        notes TEXT NULL,
        latitude DOUBLE NULL,
        longitude DOUBLE NULL,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX user_addresses_user_created_idx (user_id, created_at),
        INDEX user_addresses_default_idx (user_id, is_default)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await pool.query("INSERT IGNORE INTO fuchsia_schema_migrations (migration_id) VALUES (?)", [ADDRESS_MIGRATION_ID]);
    logger.info({ migrationId: ADDRESS_MIGRATION_ID }, "Customer address migration completed");
  }

  const [venuePaymentRows] = await pool.query("SELECT migration_id FROM fuchsia_schema_migrations WHERE migration_id = ? LIMIT 1", [VENUE_PAYMENT_MIGRATION_ID]);
  if ((venuePaymentRows as Array<{ migration_id: string }>).length === 0) {
    const paymentColumns = [
      "ALTER TABLE table_reservations ADD COLUMN payment_type VARCHAR(16) NOT NULL DEFAULT 'deposit'",
      "ALTER TABLE table_reservations ADD COLUMN payment_amount DOUBLE NOT NULL DEFAULT 0",
      "ALTER TABLE table_reservations ADD COLUMN platform_fee DOUBLE NOT NULL DEFAULT 1000",
      "ALTER TABLE table_reservations ADD COLUMN payment_wallet_id INT NULL",
      "ALTER TABLE table_reservations ADD COLUMN transaction_reference VARCHAR(120) NULL",
      "ALTER TABLE table_reservations ADD COLUMN payment_receipt_url TEXT NULL",
      "ALTER TABLE table_reservations ADD COLUMN payment_status VARCHAR(24) NOT NULL DEFAULT 'pending_review'",
    ];
    for (const statement of paymentColumns) { try { await pool.query(statement); } catch (error) { logger.warn({ error, statement }, "Venue payment column may already exist"); } }
    await pool.query("INSERT IGNORE INTO fuchsia_schema_migrations (migration_id) VALUES (?)", [VENUE_PAYMENT_MIGRATION_ID]);
  }

  const [venueDurationRows] = await pool.query("SELECT migration_id FROM fuchsia_schema_migrations WHERE migration_id = ? LIMIT 1", [VENUE_DURATION_MIGRATION_ID]);
  if ((venueDurationRows as Array<{ migration_id: string }>).length === 0) {
    try { await pool.query("ALTER TABLE table_reservations ADD COLUMN booking_days INT NOT NULL DEFAULT 1 AFTER reservation_at"); } catch (error) { logger.warn({ error }, "Venue booking duration column may already exist"); }
    await pool.query("INSERT IGNORE INTO fuchsia_schema_migrations (migration_id) VALUES (?)", [VENUE_DURATION_MIGRATION_ID]);
  }

  const [handoverRows] = await pool.query("SELECT migration_id FROM fuchsia_schema_migrations WHERE migration_id = ? LIMIT 1", [RENTAL_HANDOVER_MIGRATION_ID]);
  if ((handoverRows as Array<{ migration_id: string }>).length === 0) {
    const handoverColumns = [
      "ALTER TABLE cart_items ADD COLUMN rental_fulfillment VARCHAR(16) NULL",
      "ALTER TABLE cart_items ADD COLUMN rental_time_slot VARCHAR(16) NULL",
      "ALTER TABLE order_items ADD COLUMN rental_fulfillment VARCHAR(16) NULL",
      "ALTER TABLE order_items ADD COLUMN rental_time_slot VARCHAR(16) NULL",
    ];
    for (const statement of handoverColumns) { try { await pool.query(statement); } catch (error) { logger.warn({ error, statement }, "Rental handover column may already exist"); } }
    await pool.query("INSERT IGNORE INTO fuchsia_schema_migrations (migration_id) VALUES (?)", [RENTAL_HANDOVER_MIGRATION_ID]);
  }

  const [rentalRows] = await pool.query(
    "SELECT migration_id FROM fuchsia_schema_migrations WHERE migration_id = ? LIMIT 1",
    [RENTAL_MIGRATION_ID],
  );
  if ((rentalRows as Array<{ migration_id: string }>).length === 0) {
    const columns = [
      "ALTER TABLE products ADD COLUMN fulfillment_type VARCHAR(16) NOT NULL DEFAULT 'sale'",
      "ALTER TABLE products ADD COLUMN rental_daily_price DOUBLE NULL",
      "ALTER TABLE products ADD COLUMN rental_deposit DOUBLE NOT NULL DEFAULT 0",
      "ALTER TABLE products ADD COLUMN rental_min_days INT NOT NULL DEFAULT 1",
      "ALTER TABLE products ADD COLUMN rental_max_days INT NOT NULL DEFAULT 3",
      "ALTER TABLE cart_items ADD COLUMN fulfillment_type VARCHAR(16) NOT NULL DEFAULT 'sale'",
      "ALTER TABLE cart_items ADD COLUMN rental_start_date DATE NULL",
      "ALTER TABLE cart_items ADD COLUMN rental_days INT NULL",
      "ALTER TABLE cart_items ADD COLUMN rental_end_date DATE NULL",
      "ALTER TABLE cart_items ADD COLUMN rental_deposit DOUBLE NOT NULL DEFAULT 0",
      "ALTER TABLE cart_items ADD COLUMN rental_fulfillment VARCHAR(16) NULL",
      "ALTER TABLE cart_items ADD COLUMN rental_time_slot VARCHAR(16) NULL",
      "ALTER TABLE orders ADD COLUMN rental_deposit DOUBLE NOT NULL DEFAULT 0",
      "ALTER TABLE order_items ADD COLUMN fulfillment_type VARCHAR(16) NOT NULL DEFAULT 'sale'",
      "ALTER TABLE order_items ADD COLUMN rental_start_date DATE NULL",
      "ALTER TABLE order_items ADD COLUMN rental_days INT NULL",
      "ALTER TABLE order_items ADD COLUMN rental_end_date DATE NULL",
      "ALTER TABLE order_items ADD COLUMN rental_deposit DOUBLE NOT NULL DEFAULT 0",
      "ALTER TABLE order_items ADD COLUMN rental_fulfillment VARCHAR(16) NULL",
      "ALTER TABLE order_items ADD COLUMN rental_time_slot VARCHAR(16) NULL",
    ];
    for (const statement of columns) {
      try {
        await pool.query(statement);
      } catch (error) {
        // Makes the migration safe on databases where a column was added manually.
        if (!(error as { code?: string }).code?.includes("ER_DUP_FIELDNAME")) throw error;
      }
    }
    await pool.query("INSERT IGNORE INTO fuchsia_schema_migrations (migration_id) VALUES (?)", [RENTAL_MIGRATION_ID]);
    logger.info({ migrationId: RENTAL_MIGRATION_ID }, "Sale and rental product migration completed");
  }

  const [depositRows] = await pool.query(
    "SELECT migration_id FROM fuchsia_schema_migrations WHERE migration_id = ? LIMIT 1",
    [RENTAL_DEPOSIT_MIGRATION_ID],
  );
  if ((depositRows as Array<{ migration_id: string }>).length === 0) {
    const columns = [
      "ALTER TABLE orders ADD COLUMN rental_deposit_status VARCHAR(32) NOT NULL DEFAULT 'pending'",
      "ALTER TABLE orders ADD COLUMN rental_deposit_refunded DOUBLE NOT NULL DEFAULT 0",
      "ALTER TABLE orders ADD COLUMN rental_damage_deduction DOUBLE NOT NULL DEFAULT 0",
      "ALTER TABLE orders ADD COLUMN rental_late_fee DOUBLE NOT NULL DEFAULT 0",
      "ALTER TABLE orders ADD COLUMN rental_deposit_reason TEXT NULL",
      "ALTER TABLE orders ADD COLUMN rental_deposit_processed_at TIMESTAMP NULL",
    ];
    for (const statement of columns) {
      try {
        await pool.query(statement);
      } catch (error) {
        if (!(error as { code?: string }).code?.includes("ER_DUP_FIELDNAME")) throw error;
      }
    }
    await pool.query("INSERT IGNORE INTO fuchsia_schema_migrations (migration_id) VALUES (?)", [RENTAL_DEPOSIT_MIGRATION_ID]);
    logger.info({ migrationId: RENTAL_DEPOSIT_MIGRATION_ID }, "Rental deposit settlement migration completed");
  }

  const [walletTransactionRows] = await pool.query(
    "SELECT migration_id FROM fuchsia_schema_migrations WHERE migration_id = ? LIMIT 1",
    [WALLET_TRANSACTIONS_MIGRATION_ID],
  );
  if ((walletTransactionRows as Array<{ migration_id: string }>).length === 0) {
    await pool.query(`CREATE TABLE IF NOT EXISTS wallet_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      wallet_id INT NULL,
      kind VARCHAR(24) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      amount DOUBLE NOT NULL,
      currency VARCHAR(8) NOT NULL DEFAULT 'YER',
      provider VARCHAR(64) NOT NULL DEFAULT 'manual_local_wallet',
      external_id TEXT NULL,
      idempotency_key VARCHAR(128) NOT NULL,
      reason TEXT NULL,
      raw_response TEXT NULL,
      processed_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX wallet_transactions_order_idx (order_id),
      INDEX wallet_transactions_idempotency_idx (idempotency_key)
    )`);
    await pool.query("INSERT IGNORE INTO fuchsia_schema_migrations (migration_id) VALUES (?)", [WALLET_TRANSACTIONS_MIGRATION_ID]);
    logger.info({ migrationId: WALLET_TRANSACTIONS_MIGRATION_ID }, "Wallet transaction migration completed");
  }

  const [realVenueCatalogRows] = await pool.query(
    "SELECT migration_id FROM fuchsia_schema_migrations WHERE migration_id = ? LIMIT 1",
    [REAL_VENUE_CATALOG_MIGRATION_ID],
  );
  if ((realVenueCatalogRows as Array<{ migration_id: string }>).length === 0) {
    await addColumnIfMissing("stores", "owner_user_id", "INT NULL");
    await addColumnIfMissing("products", "rental_category", "VARCHAR(24) NOT NULL DEFAULT 'other'");
    await addColumnIfMissing("products", "event_audience", "VARCHAR(16) NOT NULL DEFAULT 'both'");
    await addColumnIfMissing("products", "table_height_cm", "DOUBLE NULL");
    await addColumnIfMissing("products", "available_colors", "VARCHAR(1200) NOT NULL DEFAULT '[]'");
    await addColumnIfMissing("products", "is_published", "BOOLEAN NOT NULL DEFAULT FALSE");
    await pool.query(`CREATE TABLE IF NOT EXISTS venue_owners (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      business_name TEXT NOT NULL,
      contact_phone VARCHAR(40) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY venue_owners_user_uq (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await pool.query(`CREATE TABLE IF NOT EXISTS venues (
      id INT AUTO_INCREMENT PRIMARY KEY,
      owner_id INT NOT NULL,
      name_ar TEXT NOT NULL,
      description TEXT NULL,
      city VARCHAR(120) NOT NULL,
      address TEXT NOT NULL,
      capacity INT NOT NULL,
      daily_price DOUBLE NOT NULL,
      audience_scope VARCHAR(16) NOT NULL DEFAULT 'both',
      primary_image_url TEXT NOT NULL,
      images VARCHAR(8000) NOT NULL DEFAULT '[]',
      amenities VARCHAR(4000) NOT NULL DEFAULT '[]',
      rules TEXT NULL,
      is_published BOOLEAN NOT NULL DEFAULT FALSE,
      rating DOUBLE NOT NULL DEFAULT 0,
      review_count INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX venues_owner_published_idx (owner_id, is_published),
      INDEX venues_city_published_idx (city, is_published)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await pool.query(`CREATE TABLE IF NOT EXISTS venue_staff (
      id INT AUTO_INCREMENT PRIMARY KEY,
      owner_id INT NOT NULL,
      user_id INT NOT NULL,
      role VARCHAR(24) NOT NULL DEFAULT 'manager',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY venue_staff_owner_user_uq (owner_id, user_id),
      INDEX venue_staff_user_active_idx (user_id, is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await pool.query(`CREATE TABLE IF NOT EXISTS venue_availability (
      id INT AUTO_INCREMENT PRIMARY KEY,
      venue_id INT NOT NULL,
      audience_scope VARCHAR(16) NOT NULL DEFAULT 'both',
      week_day INT NOT NULL,
      period VARCHAR(16) NOT NULL DEFAULT 'all_day',
      is_open BOOLEAN NOT NULL DEFAULT TRUE,
      start_time VARCHAR(5) NULL,
      end_time VARCHAR(5) NULL,
      UNIQUE KEY venue_availability_slot_uq (venue_id, audience_scope, week_day, period)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await pool.query(`CREATE TABLE IF NOT EXISTS venue_blackouts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      venue_id INT NOT NULL,
      audience_scope VARCHAR(16) NOT NULL DEFAULT 'both',
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      reason TEXT NULL,
      created_by_user_id INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX venue_blackouts_range_idx (venue_id, start_date, end_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await pool.query(`CREATE TABLE IF NOT EXISTS venue_bookings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      venue_id INT NOT NULL,
      customer_user_id INT NOT NULL,
      audience VARCHAR(16) NOT NULL,
      reservation_at TIMESTAMP NOT NULL,
      booking_days INT NOT NULL DEFAULT 1,
      party_size INT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone VARCHAR(40) NOT NULL,
      daily_price_snapshot DOUBLE NOT NULL,
      total_amount DOUBLE NOT NULL,
      payment_type VARCHAR(16) NOT NULL DEFAULT 'deposit',
      payment_amount DOUBLE NOT NULL,
      platform_fee DOUBLE NOT NULL DEFAULT 1000,
      payment_wallet_id INT NULL,
      transaction_reference VARCHAR(120) NULL,
      payment_receipt_url TEXT NULL,
      payment_status VARCHAR(24) NOT NULL DEFAULT 'pending_review',
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      idempotency_key VARCHAR(128) NOT NULL,
      expires_at TIMESTAMP NULL,
      notes TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX venue_bookings_venue_date_idx (venue_id, reservation_at),
      INDEX venue_bookings_status_date_idx (status, reservation_at),
      INDEX venue_bookings_customer_date_idx (customer_user_id, reservation_at),
      UNIQUE KEY venue_bookings_idempotency_uq (idempotency_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await pool.query(`CREATE TABLE IF NOT EXISTS venue_booking_events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id INT NOT NULL,
      actor_user_id INT NULL,
      actor_type VARCHAR(24) NOT NULL DEFAULT 'system',
      event_type VARCHAR(48) NOT NULL,
      from_status VARCHAR(32) NULL,
      to_status VARCHAR(32) NULL,
      notes TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX venue_booking_events_booking_idx (booking_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await pool.query(`CREATE TABLE IF NOT EXISTS venue_payouts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      owner_id INT NOT NULL,
      booking_id INT NOT NULL,
      amount DOUBLE NOT NULL,
      currency VARCHAR(8) NOT NULL DEFAULT 'YER',
      status VARCHAR(24) NOT NULL DEFAULT 'pending',
      transaction_reference VARCHAR(120) NULL,
      notes TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      settled_at TIMESTAMP NULL,
      UNIQUE KEY venue_payouts_booking_uq (booking_id),
      INDEX venue_payouts_owner_status_idx (owner_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await pool.query("INSERT IGNORE INTO fuchsia_schema_migrations (migration_id) VALUES (?)", [REAL_VENUE_CATALOG_MIGRATION_ID]);
    logger.info({ migrationId: REAL_VENUE_CATALOG_MIGRATION_ID }, "Real venue owner catalog migration completed");
  }

  const [directRentalRows] = await pool.query(
    "SELECT migration_id FROM fuchsia_schema_migrations WHERE migration_id = ? LIMIT 1",
    [DIRECT_RENTAL_BOOKING_MIGRATION_ID],
  );
  if ((directRentalRows as Array<{ migration_id: string }>).length === 0) {
    await addColumnIfMissing("orders", "rental_booking_key", "VARCHAR(128) NULL");
    const [indexRows] = await pool.query(
      "SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND INDEX_NAME = 'orders_rental_booking_key_uq' LIMIT 1",
    );
    if ((indexRows as Array<{ INDEX_NAME: string }>).length === 0) {
      await pool.query("CREATE UNIQUE INDEX orders_rental_booking_key_uq ON orders (rental_booking_key)");
    }
    await pool.query("INSERT IGNORE INTO fuchsia_schema_migrations (migration_id) VALUES (?)", [DIRECT_RENTAL_BOOKING_MIGRATION_ID]);
    logger.info({ migrationId: DIRECT_RENTAL_BOOKING_MIGRATION_ID }, "Direct rental booking migration completed");
  }

  const [phase3Rows] = await pool.query(
    "SELECT migration_id FROM fuchsia_schema_migrations WHERE migration_id = ? LIMIT 1",
    [PARTNER_OPERATIONS_PHASE3_MIGRATION_ID],
  );
  if ((phase3Rows as Array<{ migration_id: string }>).length === 0) {
    await addColumnIfMissing("products", "rental_buffer_days", "INT NOT NULL DEFAULT 0");
    await pool.query(`CREATE TABLE IF NOT EXISTS rental_maintenance_blocks (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      reason TEXT NULL,
      created_by_user_id INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX rental_maintenance_product_range_idx (product_id, start_date, end_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await pool.query(`CREATE TABLE IF NOT EXISTS booking_change_requests (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      booking_type VARCHAR(16) NOT NULL,
      booking_id INT NOT NULL,
      customer_user_id INT NOT NULL,
      request_type VARCHAR(24) NOT NULL,
      requested_start_date DATE NULL,
      requested_days INT NULL,
      reason TEXT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'pending',
      reviewed_by_user_id INT NULL,
      response_note TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      reviewed_at TIMESTAMP NULL,
      INDEX booking_change_request_booking_status_idx (booking_type, booking_id, status),
      INDEX booking_change_request_customer_created_idx (customer_user_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await pool.query(`CREATE TABLE IF NOT EXISTS partner_notifications (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      recipient_user_id INT NOT NULL,
      booking_type VARCHAR(16) NULL,
      booking_id INT NULL,
      request_id INT NULL,
      type VARCHAR(40) NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX partner_notifications_user_created_idx (recipient_user_id, created_at),
      INDEX partner_notifications_user_read_idx (recipient_user_id, is_read)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await pool.query("INSERT IGNORE INTO fuchsia_schema_migrations (migration_id) VALUES (?)", [PARTNER_OPERATIONS_PHASE3_MIGRATION_ID]);
    logger.info({ migrationId: PARTNER_OPERATIONS_PHASE3_MIGRATION_ID }, "Partner operations phase 3 migration completed");
  }

  const [partnerAccountsRows] = await pool.query(
    "SELECT migration_id FROM fuchsia_schema_migrations WHERE migration_id = ? LIMIT 1",
    [PARTNER_ACCOUNTS_MIGRATION_ID],
  );
  if ((partnerAccountsRows as Array<{ migration_id: string }>).length === 0) {
    await addColumnIfMissing("users", "account_type", "VARCHAR(24) NOT NULL DEFAULT 'customer'");
    await addColumnIfMissing("users", "partner_permissions", "TEXT NOT NULL");
    await pool.query("UPDATE users SET partner_permissions = ? WHERE partner_permissions IS NULL OR partner_permissions = ''", ["{\"products\":false,\"rentals\":false,\"venueBookings\":false}"]);
    await pool.query("INSERT IGNORE INTO fuchsia_schema_migrations (migration_id) VALUES (?)", [PARTNER_ACCOUNTS_MIGRATION_ID]);
    logger.info({ migrationId: PARTNER_ACCOUNTS_MIGRATION_ID }, "Partner accounts migration completed");
  }
}
