-- =============================================================
-- BOOK STEP: 初期スキーマ定義
-- 「一冊の本から、次の一歩が始まる。」
-- =============================================================
-- 前提: Supabaseプロジェクトには auth.users テーブルが既に存在する

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- あいまい検索(タイトル/著者名等)用

-- -------------------------------------------------------------
-- ENUM 定義
-- -------------------------------------------------------------
create type reading_status as enum (
  'want_to_read',  -- 読みたい
  'reading',       -- 読書中
  'finished',      -- 読了
  'paused',        -- 中断
  'reread_wanted'  -- 再読したい
);

create type visibility_level as enum (
  'public',        -- 全体公開
  'friends_only',  -- 友達のみ
  'private'        -- 非公開
);

create type friendship_status as enum ('pending', 'accepted', 'rejected', 'blocked');

create type user_role as enum ('user', 'admin');
create type user_status as enum ('active', 'suspended');

create type notification_type as enum (
  'friend_request',
  'friend_accepted',
  'post_liked',
  'post_commented',
  'friend_new_book',
  'goal_achieved'
);

create type report_target_type as enum ('reading_post', 'comment', 'user');
create type report_status as enum ('open', 'reviewed', 'dismissed');

create type goal_type as enum ('monthly', 'yearly');

-- -------------------------------------------------------------
-- profiles: auth.users を拡張するユーザープロフィール
-- -------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  avatar_url text,
  bio text,
  favorite_genres text[] default '{}',
  role user_role not null default 'user',
  status user_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-zA-Z0-9_]{3,20}$')
);
create index idx_profiles_username on profiles using gin (username gin_trgm_ops);

-- -------------------------------------------------------------
-- genres: ジャンルマスタ(管理画面から管理)
-- -------------------------------------------------------------
create table genres (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  slug text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

-- -------------------------------------------------------------
-- books: 書籍そのものの基本情報(ユーザー間で共有・重複排除)
-- -------------------------------------------------------------
create table books (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  author text not null,
  isbn10 text,
  isbn13 text,
  cover_image_url text,
  publisher text,
  published_date date,
  description text,
  page_count integer,
  genre_id uuid references genres(id) on delete set null,
  external_source text, -- 'google_books' | 'openbd' | 'manual'
  external_source_id text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- 同じISBNの本の重複登録を防止(ISBNがある場合のみユニーク)
create unique index uniq_books_isbn13 on books (isbn13) where isbn13 is not null;
create unique index uniq_books_isbn10 on books (isbn10) where isbn10 is not null;
create index idx_books_title on books using gin (title gin_trgm_ops);
create index idx_books_author on books using gin (author gin_trgm_ops);
create index idx_books_genre on books (genre_id);

-- -------------------------------------------------------------
-- reading_posts: ユーザーごとの読書記録(本と分離)
-- -------------------------------------------------------------
create table reading_posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  reading_status reading_status not null default 'want_to_read',
  started_at date,
  finished_at date,
  summary text,               -- 自分なりの要約
  review text,                -- 感想
  learnings text,             -- 学んだこと
  action_items text,          -- 実践したいこと
  memorable_quotes text,      -- 印象に残った言葉
  rating smallint check (rating between 1 and 5),
  visibility visibility_level not null default 'friends_only',
  summary_url text,
  youtube_url text,
  amazon_url text,
  reference_url text,
  is_favorite boolean not null default false,
  is_hidden boolean not null default false, -- 管理者による非表示(論理削除)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, book_id) -- 同じ本を同じユーザーが二重登録しない
);
create index idx_reading_posts_user on reading_posts (user_id, created_at desc);
create index idx_reading_posts_book on reading_posts (book_id);
create index idx_reading_posts_status on reading_posts (reading_status);
create index idx_reading_posts_visibility on reading_posts (visibility);

-- -------------------------------------------------------------
-- friendships: 友達関係
-- -------------------------------------------------------------
create table friendships (
  id uuid primary key default uuid_generate_v4(),
  requester_id uuid not null references profiles(id) on delete cascade,
  addressee_id uuid not null references profiles(id) on delete cascade,
  status friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint no_self_friendship check (requester_id <> addressee_id),
  unique (requester_id, addressee_id) -- 同じユーザーへの重複申請を防止
);
create index idx_friendships_addressee on friendships (addressee_id, status);
create index idx_friendships_requester on friendships (requester_id, status);

-- -------------------------------------------------------------
-- follows: フォロー機能(将来拡張用。MVPでは未使用)
-- -------------------------------------------------------------
create table follows (
  id uuid primary key default uuid_generate_v4(),
  follower_id uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint no_self_follow check (follower_id <> following_id),
  unique (follower_id, following_id)
);

-- -------------------------------------------------------------
-- likes / comments
-- -------------------------------------------------------------
create table likes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  reading_post_id uuid not null references reading_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, reading_post_id) -- 同一投稿への二重いいねを防止
);
create index idx_likes_post on likes (reading_post_id);

create table comments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  reading_post_id uuid not null references reading_posts(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_comments_post on comments (reading_post_id, created_at);

-- -------------------------------------------------------------
-- notifications
-- -------------------------------------------------------------
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade, -- 通知の受信者
  actor_id uuid references profiles(id) on delete set null,        -- 通知を発生させたユーザー
  type notification_type not null,
  reading_post_id uuid references reading_posts(id) on delete cascade,
  friendship_id uuid references friendships(id) on delete cascade,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_user on notifications (user_id, is_read, created_at desc);

-- -------------------------------------------------------------
-- reading_goals
-- -------------------------------------------------------------
create table reading_goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  goal_type goal_type not null,
  target_count integer not null check (target_count > 0),
  target_year integer not null,
  target_month integer check (target_month between 1 and 12), -- monthly の場合のみ使用
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, goal_type, target_year, target_month)
);

-- -------------------------------------------------------------
-- reports: 通報
-- -------------------------------------------------------------
create table reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  target_type report_target_type not null,
  target_id uuid not null,
  reason text not null,
  description text,
  status report_status not null default 'open',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references profiles(id) on delete set null
);
create index idx_reports_status on reports (status);

-- -------------------------------------------------------------
-- announcements: お知らせ配信
-- -------------------------------------------------------------
create table announcements (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  body text not null,
  published_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------
-- subscriptions: 課金プラン(将来のStripe連携用。MVPでは未使用)
-- -------------------------------------------------------------
create table subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade unique,
  plan text not null default 'free', -- 'free' | 'premium'
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------
-- link_click_events: KPI計測用(外部リンククリックのイベントログ)
-- 個人を不必要に特定しないよう、ログインユーザーのみ user_id を記録
-- -------------------------------------------------------------
create table link_click_events (
  id uuid primary key default uuid_generate_v4(),
  reading_post_id uuid references reading_posts(id) on delete cascade,
  link_type text not null, -- 'summary' | 'youtube' | 'amazon' | 'reference'
  user_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_link_click_events_type on link_click_events (link_type, created_at);

-- -------------------------------------------------------------
-- updated_at 自動更新トリガー
-- -------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger trg_books_updated_at before update on books
  for each row execute function set_updated_at();
create trigger trg_reading_posts_updated_at before update on reading_posts
  for each row execute function set_updated_at();
create trigger trg_friendships_updated_at before update on friendships
  for each row execute function set_updated_at();
create trigger trg_comments_updated_at before update on comments
  for each row execute function set_updated_at();
create trigger trg_reading_goals_updated_at before update on reading_goals
  for each row execute function set_updated_at();
create trigger trg_announcements_updated_at before update on announcements
  for each row execute function set_updated_at();
create trigger trg_subscriptions_updated_at before update on subscriptions
  for each row execute function set_updated_at();

-- -------------------------------------------------------------
-- 新規ユーザー登録時に profiles を自動作成
-- (auth.users への insert をトリガーに profiles を生成)
-- -------------------------------------------------------------
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', 'ユーザー')
  );
  insert into public.subscriptions (user_id, plan) values (new.id, 'free');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
