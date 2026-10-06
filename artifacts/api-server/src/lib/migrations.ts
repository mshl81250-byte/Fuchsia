import { pool } from "@workspace/db";
import { logger } from "./logger";

const MIGRATION_ID = "20261006_reservations_and_order_tracking_v2";

/** Additive, idempotent schema preparation. No existing application data is modified or deleted. */
export async function runMigrations(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fuchsia_schema_migrations (
      migration_id VARCHAR(160) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [rows] = await pool.query("SELECT migration_id FROM fuchsia_schema_migrations WHERE migration_id = ? LIMIT 1", [MIGRATION_ID]);
  if ((rows as Array<{ migration_id: string }>).length > 0) {
    return;
  }

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

  await pool.query("INSERT IGNORE INTO fuchsia_schema_migrations (migration_id) VALUES (?)", [MIGRATION_ID]);
  logger.info({ migrationId: MIGRATION_ID }, "Database migration completed");
}
