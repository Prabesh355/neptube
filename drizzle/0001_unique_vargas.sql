CREATE TYPE "public"."sentiment" AS ENUM('positive', 'negative', 'neutral');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin', 'moderator');--> statement-breakpoint
CREATE TYPE "public"."video_status" AS ENUM('draft', 'pending', 'published', 'rejected');--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "sentiment" "sentiment";--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "sentiment_score" real;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "is_toxic" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "toxicity_score" real;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "is_hidden" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_banned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "status" "video_status" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "tags" jsonb;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "ai_summary" text;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "transcript" text;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "nsfw_score" real;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "is_nsfw" boolean DEFAULT false;