-- Add community_post to report_target enum
ALTER TYPE "report_target" ADD VALUE IF NOT EXISTS 'community_post';

-- Create community_post_comments table
CREATE TABLE IF NOT EXISTS "community_post_comments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "post_id" uuid NOT NULL REFERENCES "community_posts"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "content" text NOT NULL,
  "like_count" integer DEFAULT 0 NOT NULL,
  "is_hidden" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
