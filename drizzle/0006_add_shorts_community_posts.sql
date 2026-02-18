-- Add isShort and allowDownload to videos
ALTER TABLE videos ADD COLUMN IF NOT EXISTS is_short boolean DEFAULT false;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS allow_download boolean DEFAULT true;

-- Create community_post_type enum
DO $$ BEGIN
  CREATE TYPE community_post_type AS ENUM ('text', 'image', 'poll');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add community_post notification type
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'community_post';

-- Community Posts table
CREATE TABLE IF NOT EXISTS community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type community_post_type NOT NULL DEFAULT 'text',
  content text NOT NULL,
  image_url text,
  like_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

-- Poll Options table
CREATE TABLE IF NOT EXISTS poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  text text NOT NULL,
  vote_count integer NOT NULL DEFAULT 0
);

-- Poll Votes table
CREATE TABLE IF NOT EXISTS poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  created_at timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS poll_votes_user_post_idx ON poll_votes (user_id, post_id);

-- Community Post Likes table
CREATE TABLE IF NOT EXISTS community_post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  created_at timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS community_post_likes_user_post_idx ON community_post_likes (user_id, post_id);
