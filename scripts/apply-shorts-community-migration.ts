import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function applyMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  console.log("Applying migration: 0006_add_shorts_community_posts.sql");

  // Execute statements individually to handle the DO $$ blocks properly
  const queries = [
    // Add isShort and allowDownload to videos
    `ALTER TABLE videos ADD COLUMN IF NOT EXISTS is_short boolean DEFAULT false`,
    `ALTER TABLE videos ADD COLUMN IF NOT EXISTS allow_download boolean DEFAULT true`,
    // Create enum  
    `CREATE TYPE community_post_type AS ENUM ('text', 'image', 'poll')`,
    // Add notification type
    `ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'community_post'`,
    // Community Posts table
    `CREATE TABLE IF NOT EXISTS community_posts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type community_post_type NOT NULL DEFAULT 'text',
      content text NOT NULL,
      image_url text,
      like_count integer NOT NULL DEFAULT 0,
      comment_count integer NOT NULL DEFAULT 0,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL
    )`,
    // Poll Options table
    `CREATE TABLE IF NOT EXISTS poll_options (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
      text text NOT NULL,
      vote_count integer NOT NULL DEFAULT 0
    )`,
    // Poll Votes table
    `CREATE TABLE IF NOT EXISTS poll_votes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      option_id uuid NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
      post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
      created_at timestamp DEFAULT now() NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS poll_votes_user_post_idx ON poll_votes (user_id, post_id)`,
    // Community Post Likes table
    `CREATE TABLE IF NOT EXISTS community_post_likes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
      created_at timestamp DEFAULT now() NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS community_post_likes_user_post_idx ON community_post_likes (user_id, post_id)`,
  ];

  for (const query of queries) {
    try {
      await sql(query);
      console.log("\u2713 Executed:", query.substring(0, 80) + "...");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("already exists") || msg.includes("duplicate")) {
        console.log("\u2298 Skipped (already exists):", query.substring(0, 80) + "...");
      } else {
        console.error("\u2717 Failed:", query.substring(0, 80) + "...");
        console.error(msg);
      }
    }
  }

  console.log("\nMigration complete!");
}

applyMigration();
