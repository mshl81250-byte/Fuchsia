import { pool } from "@workspace/db";
import { logger } from "./logger";

const COMMERCE_MIGRATION_ID = "20261006_reservations_and_order_tracking_v2";
const ADDRESS_MIGRATION_ID = "20261006_customer_addresses_v1";
const RENTAL_MIGRATION_ID = "20261007_sale_and_rental_products_v1";
const RENTAL_DEPOSIT_MIGRATION_ID = "20261007_rental_deposit_settlement_v1";
const WALLET_TRANSACTIONS_MIGRATION_ID = "20261007_wallet_transactions_v1";
const VENUE_PAYMENT_MIGRATION_ID = "20261007_venue_reservation_payments_v1";

/** Additive, idempotent schema preparation. Existing customer and commerce data is preserved. */
export async function runMigrations(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fuchsia_schema_migrations (
      migration_id VARCHAR(160) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

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
      "ALTER TABLE orders ADD COLUMN rental_deposit DOUBLE NOT NULL DEFAULT 0",
      "ALTER TABLE order_items ADD COLUMN fulfillment_type VARCHAR(16) NOT NULL DEFAULT 'sale'",
      "ALTER TABLE order_items ADD COLUMN rental_start_date DATE NULL",
      "ALTER TABLE order_items ADD COLUMN rental_days INT NULL",
      "ALTER TABLE order_items ADD COLUMN rental_end_date DATE NULL",
      "ALTER TABLE order_items ADD COLUMN rental_deposit DOUBLE NOT NULL DEFAULT 0",
    ];
    for (const statement of columns) {
      try {
        await pool.query(statement);
      } catch (error) {
        // Makes the migration safe on databases where a column was added manually.
        if (!(error as { code?: string }).code?.includes("ER_DUP_FIELDNAME")) throw error;
      }
    }
    await pool.query(`UPDATE products SET
      fulfillment_type = 'rental',
      rental_daily_price = CASE id WHEN 1 THEN 50000 WHEN 2 THEN 35000 WHEN 3 THEN 40000 WHEN 7 THEN 18000 WHEN 8 THEN 14000 ELSE rental_daily_price END,
      rental_deposit = CASE id WHEN 1 THEN 30000 WHEN 2 THEN 20000 WHEN 3 THEN 25000 WHEN 7 THEN 10000 WHEN 8 THEN 8000 ELSE rental_deposit END,
      rental_min_days = 1, rental_max_days = 3
      WHERE category_id IN (1, 3) AND (name_ar LIKE '%كوش%' OR name_ar LIKE '%طاولة%')`);
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
}
