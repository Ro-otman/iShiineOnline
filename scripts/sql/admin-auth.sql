CREATE TABLE IF NOT EXISTS admin_users (
  id_admin BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  display_name VARCHAR(120) NOT NULL,
  access_key_hash BINARY(32) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'owner',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_admin),
  UNIQUE KEY uniq_admin_users_access_key_hash (access_key_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_refresh_tokens (
  id_refresh BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_admin BIGINT UNSIGNED NOT NULL,
  token_hash BINARY(32) NOT NULL,
  user_agent VARCHAR(255) NULL,
  ip_address VARCHAR(64) NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME NULL,
  revoked_at DATETIME NULL,
  PRIMARY KEY (id_refresh),
  UNIQUE KEY uniq_admin_refresh_tokens_token_hash (token_hash),
  KEY idx_admin_refresh_tokens_admin (id_admin),
  KEY idx_admin_refresh_tokens_expires (expires_at),
  CONSTRAINT fk_admin_refresh_tokens_admin
    FOREIGN KEY (id_admin) REFERENCES admin_users (id_admin)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exemple d'insertion manuelle d'un admin.
-- Remplace la clé entre guillemets par une longue valeur secrète.
INSERT INTO admin_users (display_name, access_key_hash, role, is_active)
VALUES (
  'Julius Admin',
  UNHEX(SHA2('remplace-cette-cle-admin-par-une-valeur-longue-et-secrete', 256)),
  'owner',
  1
);
