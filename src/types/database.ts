// BOOK STEP: ドメイン型定義
// Supabaseの型生成(supabase gen types)を使う場合は本ファイルを置き換えてください

export type ReadingStatus =
  | "want_to_read"
  | "reading"
  | "finished"
  | "paused"
  | "reread_wanted";

export type VisibilityLevel = "public" | "friends_only" | "private";
export type FriendshipStatus = "pending" | "accepted" | "rejected" | "blocked";
export type UserRole = "user" | "admin";
export type NotificationType =
  | "friend_request"
  | "friend_accepted"
  | "post_liked"
  | "post_commented"
  | "friend_new_book"
  | "goal_achieved";

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  favorite_genres: string[];
  role: UserRole;
  status: "active" | "suspended";
  created_at: string;
  updated_at: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn10: string | null;
  isbn13: string | null;
  cover_image_url: string | null;
  publisher: string | null;
  published_date: string | null;
  description: string | null;
  page_count: number | null;
  genre_id: string | null;
  external_source: string | null;
  external_source_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReadingPost {
  id: string;
  user_id: string;
  book_id: string;
  reading_status: ReadingStatus;
  started_at: string | null;
  finished_at: string | null;
  summary: string | null;
  review: string | null;
  learnings: string | null;
  action_items: string | null;
  memorable_quotes: string | null;
  rating: number | null;
  visibility: VisibilityLevel;
  summary_url: string | null;
  youtube_url: string | null;
  amazon_url: string | null;
  reference_url: string | null;
  is_favorite: boolean;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  // JOINして取得する場合の付随情報
  book?: Book;
  author_profile?: Profile;
  like_count?: number;
  comment_count?: number;
  liked_by_me?: boolean;
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
  requester?: Profile;
  addressee?: Profile;
}

export interface Comment {
  id: string;
  user_id: string;
  reading_post_id: string;
  content: string;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  author?: Profile;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: NotificationType;
  reading_post_id: string | null;
  friendship_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
  actor?: Profile;
}

export interface ReadingGoal {
  id: string;
  user_id: string;
  goal_type: "monthly" | "yearly";
  target_count: number;
  target_year: number;
  target_month: number | null;
}
