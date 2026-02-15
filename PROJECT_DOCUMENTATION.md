# NepTube - Project Documentation 📺

## What is NepTube?
NepTube is a **YouTube-clone video sharing platform** built with modern web technologies. Users can upload, watch, search, and interact with videos, while admins can manage the platform.

**🔗 GitHub Repository:** https://github.com/Prabesh355/neptube

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 16** | React framework with App Router, Server Components, Turbopack |
| **TypeScript** | Type-safe JavaScript |
| **Clerk** | Authentication (sign up, sign in, user management) |
| **tRPC** | Type-safe API calls between frontend and backend |
| **Drizzle ORM** | Database queries with TypeScript |
| **Neon PostgreSQL** | Serverless cloud database |
| **UploadThing** | File uploads (videos up to 512MB, thumbnails) |
| **Pollinations AI** | Free AI thumbnail generation |
| **Tailwind CSS** | Utility-first CSS styling |
| **shadcn/ui** | Pre-built UI components (buttons, cards, dialogs, etc.) |
| **Bun** | Fast JavaScript runtime & package manager |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  Next.js App Router + React + Tailwind CSS + shadcn/ui      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         tRPC API                             │
│  Type-safe procedures (queries & mutations)                  │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│    Clerk      │    │ Neon PostgreSQL│    │  UploadThing  │
│ Authentication│    │    Database    │    │  File Storage │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (sign-in, sign-up)
│   ├── (home)/            # Home layout
│   ├── admin/             # Admin panel (dashboard, users, videos, reports, settings)
│   ├── api/               # API routes
│   │   ├── generate-thumbnail/  # AI thumbnail generation
│   │   ├── trpc/          # tRPC handler
│   │   ├── uploadthing/   # File upload handlers
│   │   └── users/webhook/ # Clerk webhook for user sync
│   ├── banned/            # Banned user page
│   ├── channel/[userId]/  # Public channel/profile page
│   ├── embed/[videoId]/   # Embeddable video player
│   ├── feed/              # Video feed, video player, subscriptions, trending
│   ├── playlists/         # Playlists, watch history, liked videos
│   └── studio/            # Creator studio (upload, edit, analytics)
├── components/ui/         # shadcn/ui components
├── db/                    # Database schema & connection
├── lib/                   # Utilities (AI, uploads, helpers)
├── modules/               # Feature modules (auth, home)
└── trpc/                  # tRPC router definitions
    └── routers/
        ├── app.ts         # Root router
        ├── admin.ts       # Admin procedures
        ├── comments.ts    # Comments with ML moderation
        ├── history.ts     # Watch history
        ├── notifications.ts # Notifications
        ├── playlists.ts   # Playlists & liked videos
        ├── reports.ts     # Content reports
        ├── subscriptions.ts # Channel subscriptions
        └── videos.ts      # Video CRUD, ML pipeline, feed
```

---

## ✨ Features Implemented

### 👤 User Features
| Feature | Description |
|---------|-------------|
| **Sign Up / Sign In** | Email-based authentication via Clerk |
| **Video Upload** | Upload videos up to 512MB |
| **AI Thumbnail Generation** | Generate thumbnails using Pollinations AI |
| **Manual Thumbnail Upload** | Upload custom thumbnails |
| **Search Videos** | Search by title, description, or uploader name |
| **Watch Videos** | Video player with view count & watch history tracking |
| **Like/Dislike** | React to videos with toggle behavior |
| **Comments** | Comment on videos with AI sentiment analysis & toxicity detection |
| **Subscribe/Unsubscribe** | Subscribe to channels, see subscriber count |
| **Subscriptions Feed** | Dedicated feed showing videos from subscribed channels |
| **Trending Page** | AI-scored trending videos with decay factor |
| **Watch History** | Automatic watch history tracking with clear/remove |
| **Liked Videos** | View all videos you've liked |
| **Playlists** | Create, manage, and view custom playlists |
| **Save to Playlist** | Add videos to playlists from the video player |
| **Channel Pages** | Public user profiles with banner, videos, and subscriber count |
| **Share Videos** | Copy video link to clipboard |
| **Report Videos** | Report inappropriate content with categorized reasons |
| **Notifications** | Bell icon with real-time unread count (comments, replies, subscriptions, new videos) |
| **Creator Studio** | Dashboard to manage your videos |
| **Creator Analytics** | View count, like/dislike ratio, engagement rate, top videos |
| **Edit Videos** | Change title, description, category, visibility, thumbnail |
| **Delete Videos** | Remove your own videos |
| **Dark/Light Theme** | Toggle between dark and light mode (persisted) |
| **Infinite Scroll** | Automatic loading of more videos as you scroll |
| **Video Embed** | Embeddable video player at /embed/[videoId] |

### 👑 Admin Features
| Feature | Description |
|---------|-------------|
| **Admin Dashboard** | Platform statistics (users, videos, views) |
| **User Management** | View all users, change roles, ban/unban |
| **Video Management** | View all videos, approve/reject/delete |
| **Content Reports** | Review, resolve, or dismiss user-submitted reports |
| **Platform Settings** | Configure site settings |

### 🤖 ML/AI Features
| Feature | Description |
|---------|-------------|
| **Auto-Tagging** | AI generates relevant tags from video title/description |
| **AI Summary** | Automatic video content summary generation |
| **Sentiment Analysis** | Comments analyzed for positive/negative/neutral sentiment |
| **Toxicity Detection** | Comments auto-filtered for toxic content |
| **AI Thumbnails** | Generate thumbnails using Pollinations AI image generation |
| **Transcription** | Video audio transcription via Whisper (Replicate) |
| **NSFW Detection** | Automatic NSFW content flagging with confidence score |
| **Content Recommendations** | AI-powered related video suggestions with relevance scoring |
| **Auto-Categorization** | AI automatically categorizes uploaded videos |
| **Auto-Generated Chapters** | AI generates video chapters from transcript |
| **Trending Score** | Algorithm using views, likes, comments & time decay |

### 🔒 Security Features
| Feature | Description |
|---------|-------------|
| **Role-based Access** | user, admin, moderator roles |
| **Protected Routes** | Admin panel only for admins |
| **Ban System** | Ban users from uploading/accessing |
| **Middleware** | Route protection via Clerk middleware |
| **Content Moderation** | AI toxicity + NSFW detection + user reports |

---

## 🗄️ Database Schema

### Users Table
```sql
- id (UUID, primary key)
- clerk_id (text, unique) - Links to Clerk
- name (text)
- image_url (text)
- banner_url (text) - Channel banner
- description (text) - Channel description
- role (enum: user, admin, moderator)
- is_banned (boolean)
- ban_reason (text)
- created_at, updated_at
```

### Videos Table
```sql
- id (UUID, primary key)
- user_id (UUID, foreign key)
- title (text)
- description (text)
- category (text) - AI auto-categorized
- video_url (text)
- thumbnail_url (text)
- visibility (enum: public, private, unlisted)
- status (enum: draft, pending, published, rejected)
- view_count, like_count, dislike_count, comment_count (integers)
-- ML fields:
- tags (jsonb) - AI-generated tags
- ai_summary (text) - AI content summary
- transcript (text) - Audio transcription
- chapters (jsonb) - AI-generated chapters [{time, title}]
- nsfw_score (real) - NSFW confidence score
- is_nsfw (boolean) - NSFW flag
- created_at, updated_at
```

### Comments Table
```sql
- id (UUID, primary key)
- user_id, video_id (UUID, foreign keys)
- parent_id (UUID) - For nested replies
- content (text)
- like_count (integer)
- sentiment (enum: positive, negative, neutral)
- sentiment_score (real)
- is_toxic (boolean), toxicity_score (real)
- is_hidden (boolean)
- created_at, updated_at
```

### Video Likes Table
```sql
- user_id (UUID)
- video_id (UUID)
- is_like (boolean) - true=like, false=dislike
```

### Subscriptions Table
```sql
- subscriber_id (UUID, foreign key -> users)
- channel_id (UUID, foreign key -> users)
- created_at
```

### Watch History Table
```sql
- user_id (UUID), video_id (UUID)
- watched_at (timestamp)
- watch_duration (integer) - seconds watched
```

### Playlists & Playlist Videos Tables
```sql
-- playlists:
- id, name, description, visibility, user_id, created_at, updated_at

-- playlist_videos:
- playlist_id, video_id, position, added_at
```

### Notifications Table
```sql
- user_id (UUID) - Recipient
- type (enum: new_video, comment, reply, like, subscription, report_resolved)
- title, message, link (text)
- is_read (boolean)
- from_user_id (UUID) - Who triggered it
- video_id (UUID) - Related video
- created_at
```

### Reports Table
```sql
- reporter_id (UUID)
- target_type (enum: video, comment, user)
- target_id (UUID)
- reason, description (text)
- status (enum: pending, reviewed, resolved, dismissed)
- resolved_by (UUID), resolved_at, resolved_note
- created_at
```

---

## 🔑 Key Implementation Details

### 1. Authentication Flow
```
User clicks "Sign In" → Clerk modal opens → User enters email/password
→ Clerk authenticates → Middleware checks auth → User data synced to DB
```

### 2. Video Upload Flow with ML Pipeline
```
User goes to /studio/upload → Selects video file → UploadThing uploads to cloud
→ User fills details (title, description) → Optionally generates AI thumbnail
→ Video saved to database → ML pipeline fires (async):
  Step 1: Auto-tagging (Pollinations AI)
  Step 2: AI Summary generation
  Step 3: NSFW Detection (Replicate)
  Step 4: Auto-Categorization (Pollinations AI)
  Step 5: Audio Transcription (Whisper via Replicate)
  Step 6: Chapter Generation from transcript
  Step 7: Subscriber Notifications sent
```

### 3. AI Thumbnail Generation Flow
```
User enters title → Clicks "Generate AI Thumbnail"
→ API creates prompt → Pollinations AI generates image
→ Image downloaded → Uploaded to UploadThing → URL saved
```

### 4. Search & Infinite Scroll
```
User types in search bar → Presses Enter → URL updates with ?q=query
→ Feed page reads query → tRPC infinite query fetches first page
→ IntersectionObserver detects scroll → Auto-fetches next page via cursor
```

### 5. Comment Moderation Pipeline
```
User posts comment → tRPC creates comment → Async ML analysis:
  - Sentiment Analysis (positive/negative/neutral)
  - Toxicity Detection (auto-hide if toxic)
→ Video comment count incremented → Notification sent to video owner
→ If reply: Notification sent to parent comment author
```

### 6. Trending Algorithm
```
Score = (viewCount × 1.0 + likeCount × 2.0 + commentCount × 3.0 - dislikeCount × 1.5)
      × decayFactor(age in hours)
Decay = 1 / (1 + ageInHours / 24)
→ Higher score = more trending
→ Recent videos with high engagement rank higher
```

### 7. Notification System
```
Events that trigger notifications:
  - New subscriber → Channel owner notified
  - New comment → Video owner notified
  - Reply to comment → Parent comment author notified
  - New video from subscribed channel → All subscribers notified
Bell icon in navbar → Popover shows latest 10 → Unread count badge
```

### 8. Admin Authorization
```
User accesses /admin → Middleware checks auth → tRPC checks user.role
→ If role !== 'admin' → Access denied
→ If admin → Full access to admin procedures (users, videos, reports)
```

---

## 🌐 External Services

| Service | URL | Purpose |
|---------|-----|---------|
| **Neon** | console.neon.tech | Database hosting |
| **Clerk** | dashboard.clerk.com | User authentication |
| **UploadThing** | uploadthing.com | File storage |
| **Pollinations AI** | pollinations.ai | AI text/image generation (tags, summary, thumbnails, chapters) |
| **Replicate** | replicate.com | Whisper transcription & NSFW detection |
| **GitHub** | github.com/Prabesh355/neptube | Source code |

---

## 🚀 How to Run Locally

```bash
# Clone the repository
git clone https://github.com/Prabesh355/neptube.git
cd neptube

# Install dependencies
bun install

# Set up environment variables (create .env.local)
DATABASE_URL=your_neon_database_url
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_public_key
CLERK_SECRET_KEY=your_clerk_secret_key
UPLOADTHING_TOKEN=your_uploadthing_token
REPLICATE_API_TOKEN=your_replicate_token  # For transcription & NSFW detection

# Run development server
bun run dev

# Open in browser
http://localhost:3000
```

---

## 📸 Pages & Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/feed` | Video feed with infinite scroll and search |
| `/feed/[videoId]` | Video player with comments, subscribe, share, report, chapters |
| `/feed/subscriptions` | Videos from subscribed channels |
| `/feed/trending` | AI-scored trending videos |
| `/channel/[userId]` | Public channel profile with banner, videos, subscribe |
| `/playlists` | Manage custom playlists |
| `/playlists/[playlistId]` | View playlist videos |
| `/playlists/history` | Watch history |
| `/playlists/liked` | Liked videos |
| `/studio` | Creator studio — manage uploads |
| `/studio/upload` | Upload new video |
| `/studio/edit/[videoId]` | Edit video details |
| `/studio/analytics` | Creator analytics dashboard |
| `/admin` | Admin dashboard |
| `/admin/users` | User management |
| `/admin/videos` | Video moderation |
| `/admin/reports` | Content reports queue |
| `/admin/settings` | Platform settings |
| `/embed/[videoId]` | Embeddable video player (minimal UI) |

---

## 💡 Why These Technologies?

**Q: Why Next.js 16?**
A: Latest version with Turbopack for faster development, App Router for better routing, and Server Components for performance.

**Q: Why tRPC instead of REST API?**
A: tRPC provides end-to-end type safety - if you change an API, TypeScript catches errors immediately.

**Q: Why Clerk for authentication?**
A: Clerk handles all auth complexity (passwords, sessions, OAuth) with minimal code. Very secure and easy to implement.

**Q: Why Neon PostgreSQL?**
A: Serverless, scales automatically, generous free tier, works great with Drizzle ORM.

**Q: How does AI thumbnail generation work?**
A: We use Pollinations AI (free) which generates images from text prompts. The prompt is built from the video title/description.

---

## 👨‍💻 Developer

**Prabesh Basnet**
- GitHub: [@Prabesh355](https://github.com/Prabesh355)

---

## 📄 License

This project is for educational purposes.

---

*Built with ❤️ using Next.js, TypeScript, and modern web technologies*
