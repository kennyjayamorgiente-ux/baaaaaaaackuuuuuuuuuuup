-- Fix unreferenced foreign-key-like columns that are actually used by the app.
-- Intentionally left unconstrained:
--   access_logs.reservation_id / access_logs.qr_key
--     These act as historical access snapshots and currently use a signed reservation_id
--     plus legacy qr_key data that is not suitable for a hard FK design.
--   user_logs.target_id
--     This is polymorphic and can point to different tables (reservation, vehicle, user, etc.).

START TRANSACTION;

-- Normalize data before adding constraints.
DELETE fc
FROM feedback_comments fc
LEFT JOIN feedback f ON f.feedback_id = fc.feedback_id
WHERE f.feedback_id IS NULL;

UPDATE feedback_comments fc
LEFT JOIN users u ON u.user_id = fc.user_id
SET fc.user_id = NULL
WHERE fc.user_id IS NOT NULL
  AND u.user_id IS NULL;

DELETE p
FROM penalty p
LEFT JOIN users u ON u.user_id = p.user_id
WHERE u.user_id IS NULL;

UPDATE user_logs ul
LEFT JOIN users u ON u.user_id = ul.user_id
SET ul.user_id = NULL
WHERE ul.user_id IS NOT NULL
  AND u.user_id IS NULL;

DELETE tp
FROM type_privileges tp
LEFT JOIN types t ON t.type_id = tp.type_id
LEFT JOIN privileges p ON p.privilege_id = tp.privilege_id
WHERE t.type_id IS NULL
   OR p.privilege_id IS NULL;

-- Fix type mismatch so penalty.user_id can reference users.user_id.
ALTER TABLE penalty
  MODIFY user_id BIGINT(20) UNSIGNED NOT NULL;

-- Add missing foreign keys for relationships the backend actively relies on.
ALTER TABLE feedback_comments
  ADD CONSTRAINT fk_feedback_comments_feedback
    FOREIGN KEY (feedback_id) REFERENCES feedback(feedback_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  ADD CONSTRAINT fk_feedback_comments_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE penalty
  ADD CONSTRAINT fk_penalty_user_ref
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE type_privileges
  ADD CONSTRAINT fk_type_privileges_type
    FOREIGN KEY (type_id) REFERENCES types(type_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  ADD CONSTRAINT fk_type_privileges_privilege_ref
    FOREIGN KEY (privilege_id) REFERENCES privileges(privilege_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE user_logs
  ADD CONSTRAINT fk_user_logs_user_ref
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

COMMIT;
