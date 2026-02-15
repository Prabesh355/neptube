CREATE TYPE "public"."notification_type" AS ENUM('new_video', 'comment', 'reply', 'like', 'subscription', 'report_resolved');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('pending', 'reviewed', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."report_target" AS ENUM('video', 'comment', 'user');--> statement-breakpoint
CREATE TABLE "notifications" (
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
);
--> statement-breakpoint
CREATE TABLE "playlist_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"playlist_id" uuid NOT NULL,
	"video_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"visibility" "video_visibility" DEFAULT 'private' NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
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
);
--> statement-breakpoint
CREATE TABLE "watch_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"video_id" uuid NOT NULL,
	"watched_at" timestamp DEFAULT now() NOT NULL,
	"watch_duration" integer DEFAULT 0
);
--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "comment_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "chapters" jsonb;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_videos" ADD CONSTRAINT "playlist_videos_playlist_id_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_videos" ADD CONSTRAINT "playlist_videos_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_history" ADD CONSTRAINT "watch_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_history" ADD CONSTRAINT "watch_history_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;