-- Drop dialog_answers rows orphaned by duplicate sid sessions (keep lowest id per sid).
DELETE FROM `dialog_answers` WHERE `session_id` IN (
  SELECT `id` FROM `dialog_sessions`
  WHERE `sid` IS NOT NULL
  AND `id` NOT IN (
    SELECT MIN(`id`) FROM `dialog_sessions` WHERE `sid` IS NOT NULL GROUP BY `sid`
  )
);
--> statement-breakpoint
-- Detach leads that point at duplicate sid sessions before we delete those sessions
-- (FK on leads.session_id otherwise blocks the delete).
UPDATE `leads` SET `session_id` = NULL WHERE `session_id` IN (
  SELECT `id` FROM `dialog_sessions`
  WHERE `sid` IS NOT NULL
  AND `id` NOT IN (
    SELECT MIN(`id`) FROM `dialog_sessions` WHERE `sid` IS NOT NULL GROUP BY `sid`
  )
);
--> statement-breakpoint
-- Remove the duplicate sid rows themselves.
DELETE FROM `dialog_sessions`
WHERE `sid` IS NOT NULL
AND `id` NOT IN (
  SELECT MIN(`id`) FROM `dialog_sessions` WHERE `sid` IS NOT NULL GROUP BY `sid`
);
--> statement-breakpoint
-- Collapse duplicate active sessions per (provider, contact): only the oldest
-- stays active, the rest get marked completed so the partial unique index
-- below can be created.
UPDATE `dialog_sessions` SET `state` = 'completed', `updated_at` = unixepoch()
WHERE `state` = 'active'
AND `id` NOT IN (
  SELECT MIN(`id`) FROM `dialog_sessions` WHERE `state` = 'active' GROUP BY `provider`, `contact`
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dialog_sessions_sid_unique` ON `dialog_sessions` (`sid`) WHERE `sid` IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `dialog_sessions_active_provider_contact_unique` ON `dialog_sessions` (`provider`, `contact`) WHERE `state` = 'active';
