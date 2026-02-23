-- Admin Notifications for user/creator activity
-- Notifies admins when users upload videos, post comments, create community posts, submit reports, or sign up

-- Create enum types
DO $$ BEGIN
  CREATE TYPE admin_notification_type AS ENUM (
    'new_video_upload',
    'new_comment',
    'toxic_comment',
    'new_report',
    'new_community_post',
    'new_user_signup',
    'video_updated',
    'nsfw_flagged',
    'spam_detected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE admin_notification_priority AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create admin_notifications table
CREATE TABLE IF NOT EXISTS "admin_notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "type" admin_notification_type NOT NULL,
  "priority" admin_notification_priority NOT NULL DEFAULT 'medium',
  "title" text NOT NULL,
  "message" text NOT NULL,
  "link" text,
  "is_read" boolean NOT NULL DEFAULT false,
  "is_dismissed" boolean NOT NULL DEFAULT false,
  "actor_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "target_type" text,
  "target_id" uuid,
  "metadata" jsonb,
  "read_by" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS "admin_notif_unread_idx" ON "admin_notifications" ("is_read", "is_dismissed") WHERE "is_read" = false AND "is_dismissed" = false;
CREATE INDEX IF NOT EXISTS "admin_notif_created_idx" ON "admin_notifications" ("created_at" DESC);
