import { execute } from '../config/db.js';

const sql = `
  CREATE TABLE IF NOT EXISTS notifications (
    id_notification CHAR(36) NOT NULL,
    id_user VARCHAR(255) NOT NULL,
    category VARCHAR(32) NOT NULL DEFAULT 'info',
    title VARCHAR(140) NULL,
    message VARCHAR(500) NOT NULL,
    dedupe_key VARCHAR(191) NULL,
    payload_json LONGTEXT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME NULL,
    PRIMARY KEY (id_notification),
    UNIQUE KEY uniq_notifications_dedupe_key (dedupe_key),
    KEY idx_notifications_user_created (id_user, created_at),
    KEY idx_notifications_user_read (id_user, is_read, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

await execute(sql, []);
console.log('notifications_table_ok');
