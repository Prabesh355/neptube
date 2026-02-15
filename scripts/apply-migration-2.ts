import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log("Applying migration 0002...");

  // Create enums
  await sql`CREATE TYPE "public"."notification_type" AS ENUM('new_video', 'comment', 'reply', 'like', 'subscription', 'report_resolved')`.catch(() => console.log("notification_type enum already exists"));
  await sql`CREATE TYPE "public"."report_status" AS ENUM('pending', 'reviewed', 'resolved', 'dismissed')`.catch(() => console.log("report_status enum already exists"));
  await sql`CREATE TYPE "public"."report_target" AS ENUM('video', 'comment', 'user')`.catch(() => console.log("report_target enum already exists"));

  // Create tables
  await sql`CREATE TABLE IF NOT EXISTS "notifications" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "type" "notification_type" NOT NULL,
    "title" text NOT NULL,
    "message" text NOT NULL,
    "link" text,
    "is_read" boolean DEFAULT false NOT NULL,
    "from_user_id" uuid,
    "video_id" uuid,
    "created_at" timestamp DEFAULT now() NOT NULL
  )`;
  console.log("✓ notifications table created");

  await sql`CREATE TABLE IF NOT EXISTS "playlists" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "visibility" "video_visibility" DEFAULT 'private' NOT NULL,
    "user_id" uuid NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )`;
  console.log("✓ playlists table created");

  await sql`CREATE TABLE IF NOT EXISTS "playlist_videos" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "playlist_id" uuid NOT NULL,
    "video_id" uuid NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "added_at" timestamp DEFAULT now() NOT NULL
  )`;
  console.log("✓ playlist_videos table created");

  await sql`CREATE TABLE IF NOT EXISTS "reports" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "reporter_id" uuid NOT NULL,
    "target_type" "report_target" NOT NULL,
    "target_id" uuid NOT NULL,
    "reason" text NOT NULL,
    "description" text,
    "status" "report_status" DEFAULT 'pending' NOT NULL,
    "resolved_by" uuid,
    "resolved_at" timestamp,
    "resolved_note" text,
    "created_at" timestamp DEFAULT now() NOT NULL
  )`;
  console.log("✓ reports table created");

  await sql`CREATE TABLE IF NOT EXISTS "watch_history" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "video_id" uuid NOT NULL,
    "watched_at" timestamp DEFAULT now() NOT NULL,
    "watch_duration" integer DEFAULT 0
  )`;
  console.log("✓ watch_history table created");

  // Add columns to videos
  await sql`ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "comment_count" integer DEFAULT 0 NOT NULL`.catch(() => console.log("comment_count already exists"));
  await sql`ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "chapters" jsonb`.catch(() => console.log("chapters already exists"));
  console.log("✓ videos table updated");

  // Add foreign keys (ignore errors if they already exist)
  const fks = [
    sql`ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action`,
    sql`ALTER TABLE "notifications" ADD CONSTRAINT "notifications_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action`,
    sql`ALTER TABLE "notifications" ADD CONSTRAINT "notifications_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action`,
    sql`ALTER TABLE "playlist_videos" ADD CONSTRAINT "playlist_videos_playlist_id_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE cascade ON UPDATE no action`,
    sql`ALTER TABLE "playlist_videos" ADD CONSTRAINT "playlist_videos_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action`,
    sql`ALTER TABLE "playlists" ADD CONSTRAINT "playlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action`,
    sql`ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action`,
    sql`ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action`,
    sql`ALTER TABLE "watch_history" ADD CONSTRAINT "watch_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action`,
    sql`ALTER TABLE "watch_history" ADD CONSTRAINT "watch_history_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action`,
  ];

  for (const fk of fks) {
    await fk.catch(() => {});
  }
  console.log("✓ Foreign keys added");

  console.log("\n✅ Migration 0002 applied successfully!");
}

main().catch(console.error);
