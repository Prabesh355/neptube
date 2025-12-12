-- Add qualities column to videos table as JSONB (preferred for structured data)
ALTER TABLE "videos" ADD COLUMN "qualities" jsonb;
