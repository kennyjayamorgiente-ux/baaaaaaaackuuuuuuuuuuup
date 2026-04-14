ALTER TABLE users
  ADD COLUMN external_source VARCHAR(50) NULL,
  ADD COLUMN external_type VARCHAR(20) NULL,
  ADD COLUMN external_last_synced_at DATETIME NULL;

CREATE UNIQUE INDEX uq_users_external_identity
  ON users (external_source, external_type, external_user_id);
