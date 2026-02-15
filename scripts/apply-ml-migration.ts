import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log("Applying ML schema migrations...");

  // Create sentiment enum (ignore if exists)
  try {
    await sql`CREATE TYPE "public"."sentiment" AS ENUM('positive', 'negative', 'neutral')`;
    console.log("✓ Created sentiment enum");
  } catch (e: any) {
    if (e.message?.includes("already exists")) {
      console.log("⊘ sentiment enum already exists, skipping");
    } else {
      throw e;
    }
  }

  // Add ML columns to videos (ignore if already exist)
  const videoColumns = [
    { name: "tags", sql: `ALTER TABLE "videos" ADD COLUMN "tags" jsonb` },
    { name: "ai_summary", sql: `ALTER TABLE "videos" ADD COLUMN "ai_summary" text` },
    { name: "transcript", sql: `ALTER TABLE "videos" ADD COLUMN "transcript" text` },
    { name: "nsfw_score", sql: `ALTER TABLE "videos" ADD COLUMN "nsfw_score" real` },
    { name: "is_nsfw", sql: `ALTER TABLE "videos" ADD COLUMN "is_nsfw" boolean DEFAULT false` },
  ];

  for (const col of videoColumns) {
    try {
      await sql(col.sql);
      console.log(`✓ Added videos.${col.name}`);
    } catch (e: any) {
      if (e.message?.includes("already exists")) {
        console.log(`⊘ videos.${col.name} already exists, skipping`);
      } else {
        throw e;
      }
    }
  }

  // Add ML columns to comments
  const commentColumns = [
    { name: "sentiment", sql: `ALTER TABLE "comments" ADD COLUMN "sentiment" "sentiment"` },
    { name: "sentiment_score", sql: `ALTER TABLE "comments" ADD COLUMN "sentiment_score" real` },
    { name: "is_toxic", sql: `ALTER TABLE "comments" ADD COLUMN "is_toxic" boolean DEFAULT false` },
    { name: "toxicity_score", sql: `ALTER TABLE "comments" ADD COLUMN "toxicity_score" real` },
    { name: "is_hidden", sql: `ALTER TABLE "comments" ADD COLUMN "is_hidden" boolean DEFAULT false` },
  ];

  for (const col of commentColumns) {
    try {
      await sql(col.sql);
      console.log(`✓ Added comments.${col.name}`);
    } catch (e: any) {
      if (e.message?.includes("already exists")) {
        console.log(`⊘ comments.${col.name} already exists, skipping`);
      } else {
        throw e;
      }
    }
  }

  console.log("\n✅ ML migration complete!");
}

migrate().catch(console.error);
