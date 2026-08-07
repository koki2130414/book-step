-- =============================================================
-- BOOK STEP: Row Level Security ポリシー
-- =============================================================

-- -------------------------------------------------------------
-- ヘルパー関数
-- -------------------------------------------------------------

-- 現在ログイン中のユーザーが管理者かどうか
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- 2人のユーザーが「承認済みの友達」かどうか
create or replace function is_friend(user_a uuid, user_b uuid)
returns boolean as $$
  select exists (
    select 1 from friendships
    where status = 'accepted'
      and (
        (requester_id = user_a and addressee_id = user_b) or
        (requester_id = user_b and addressee_id = user_a)
      )
  );
$$ language sql security definer stable;

-- reading_posts が現在のユーザーから閲覧可能か
create or replace function can_view_reading_post(post_owner uuid, post_visibility visibility_level)
returns boolean as $$
  select
    post_owner = auth.uid()
    or is_admin()
    or (post_visibility = 'public' and auth.uid() is not null)
    or (post_visibility = 'friends_only' and is_friend(post_owner, auth.uid()));
$$ language sql security definer stable;

-- -------------------------------------------------------------
-- RLS 有効化
-- -------------------------------------------------------------
alter table profiles enable row level security;
alter table genres enable row level security;
alter table books enable row level security;
alter table reading_posts enable row level security;
alter table friendships enable row level security;
alter table follows enable row level security;
alter table likes enable row level security;
alter table comments enable row level security;
alter table notifications enable row level security;
alter table reading_goals enable row level security;
alter table reports enable row level security;
alter table announcements enable row level security;
alter table subscriptions enable row level security;
alter table link_click_events enable row level security;

-- -------------------------------------------------------------
-- profiles
-- ・全ログインユーザーが閲覧可能(検索・プロフィール表示のため)
-- ・自分のプロフィールのみ編集可能
-- -------------------------------------------------------------
create policy "profiles_select_authenticated" on profiles
  for select using (auth.uid() is not null);

create policy "profiles_update_own" on profiles
  for update using (id = auth.uid());

create policy "profiles_update_admin" on profiles
  for update using (is_admin());

-- -------------------------------------------------------------
-- genres: 誰でも閲覧可、変更は管理者のみ
-- -------------------------------------------------------------
create policy "genres_select_all" on genres for select using (true);
create policy "genres_write_admin" on genres for all using (is_admin()) with check (is_admin());

-- -------------------------------------------------------------
-- books: ログインユーザーは閲覧・登録可能。編集は登録者か管理者のみ
-- (書籍マスタは複数ユーザーで共有されるため削除は管理者のみに制限)
-- -------------------------------------------------------------
create policy "books_select_authenticated" on books
  for select using (auth.uid() is not null);

create policy "books_insert_authenticated" on books
  for insert with check (auth.uid() is not null);

create policy "books_update_creator_or_admin" on books
  for update using (created_by = auth.uid() or is_admin());

create policy "books_delete_admin" on books
  for delete using (is_admin());

-- -------------------------------------------------------------
-- reading_posts
-- ・本人は常に自分の投稿を閲覧・作成・編集・削除可能
-- ・公開投稿はログインユーザーなら誰でも閲覧可能
-- ・友達限定投稿は承認済みの友達のみ閲覧可能
-- ・非公開投稿は本人のみ閲覧可能
-- -------------------------------------------------------------
create policy "reading_posts_select" on reading_posts
  for select using (can_view_reading_post(user_id, visibility) and (is_hidden = false or user_id = auth.uid() or is_admin()));

create policy "reading_posts_insert_own" on reading_posts
  for insert with check (user_id = auth.uid());

create policy "reading_posts_update_own_or_admin" on reading_posts
  for update using (user_id = auth.uid() or is_admin());

create policy "reading_posts_delete_own_or_admin" on reading_posts
  for delete using (user_id = auth.uid() or is_admin());

-- -------------------------------------------------------------
-- friendships: 申請者・被申請者のみ閲覧可能
-- -------------------------------------------------------------
create policy "friendships_select_related" on friendships
  for select using (requester_id = auth.uid() or addressee_id = auth.uid() or is_admin());

create policy "friendships_insert_own" on friendships
  for insert with check (requester_id = auth.uid());

-- 承認/拒否は「被申請者」のみ。申請の取消は「申請者」のみ
create policy "friendships_update_related" on friendships
  for update using (addressee_id = auth.uid() or requester_id = auth.uid());

create policy "friendships_delete_related" on friendships
  for delete using (requester_id = auth.uid() or addressee_id = auth.uid());

-- -------------------------------------------------------------
-- follows(将来拡張用)
-- -------------------------------------------------------------
create policy "follows_select_all_authenticated" on follows
  for select using (auth.uid() is not null);
create policy "follows_insert_own" on follows
  for insert with check (follower_id = auth.uid());
create policy "follows_delete_own" on follows
  for delete using (follower_id = auth.uid());

-- -------------------------------------------------------------
-- likes: 閲覧できる投稿へのいいねのみ閲覧可能。自分のいいねのみ作成・削除可能
-- -------------------------------------------------------------
create policy "likes_select_visible_post" on likes
  for select using (
    exists (
      select 1 from reading_posts rp
      where rp.id = reading_post_id
        and can_view_reading_post(rp.user_id, rp.visibility)
    )
  );

create policy "likes_insert_own" on likes
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from reading_posts rp
      where rp.id = reading_post_id
        and can_view_reading_post(rp.user_id, rp.visibility)
    )
  );

create policy "likes_delete_own" on likes
  for delete using (user_id = auth.uid());

-- -------------------------------------------------------------
-- comments: 投稿者本人・コメント投稿者本人・管理者のみ削除可能
-- -------------------------------------------------------------
create policy "comments_select_visible_post" on comments
  for select using (
    is_hidden = false and exists (
      select 1 from reading_posts rp
      where rp.id = reading_post_id
        and can_view_reading_post(rp.user_id, rp.visibility)
    )
    or is_admin()
  );

create policy "comments_insert_own" on comments
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from reading_posts rp
      where rp.id = reading_post_id
        and can_view_reading_post(rp.user_id, rp.visibility)
    )
  );

create policy "comments_delete_authorized" on comments
  for delete using (
    user_id = auth.uid() -- コメント投稿者本人
    or is_admin()
    or exists ( -- 投稿者本人(自分の投稿についたコメントを削除可能)
      select 1 from reading_posts rp
      where rp.id = reading_post_id and rp.user_id = auth.uid()
    )
  );

-- -------------------------------------------------------------
-- notifications: 本人のみ閲覧・既読更新可能
-- -------------------------------------------------------------
create policy "notifications_select_own" on notifications
  for select using (user_id = auth.uid());

create policy "notifications_update_own" on notifications
  for update using (user_id = auth.uid());

-- 通知の作成はサーバー側(service role)またはトリガーで行う想定のため
-- クライアントからの直接insertは許可しない(ポリシーを設定しない = 拒否)

-- -------------------------------------------------------------
-- reading_goals: 本人のみ
-- -------------------------------------------------------------
create policy "reading_goals_all_own" on reading_goals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- -------------------------------------------------------------
-- reports: 作成は誰でも(ログインユーザー)。閲覧・更新は管理者のみ
-- -------------------------------------------------------------
create policy "reports_insert_authenticated" on reports
  for insert with check (reporter_id = auth.uid());

create policy "reports_select_admin_or_own" on reports
  for select using (is_admin() or reporter_id = auth.uid());

create policy "reports_update_admin" on reports
  for update using (is_admin());

-- -------------------------------------------------------------
-- announcements: 公開中のものは誰でも閲覧可。作成・編集は管理者のみ
-- -------------------------------------------------------------
create policy "announcements_select_active" on announcements
  for select using (is_active = true or is_admin());

create policy "announcements_write_admin" on announcements
  for all using (is_admin()) with check (is_admin());

-- -------------------------------------------------------------
-- subscriptions: 本人のみ閲覧。更新はサーバー(service role)経由のみ
-- -------------------------------------------------------------
create policy "subscriptions_select_own" on subscriptions
  for select using (user_id = auth.uid() or is_admin());

-- -------------------------------------------------------------
-- link_click_events: 誰でも作成可(匿名クリックも許容)。閲覧は管理者のみ
-- -------------------------------------------------------------
create policy "link_click_events_insert_all" on link_click_events
  for insert with check (true);

create policy "link_click_events_select_admin" on link_click_events
  for select using (is_admin());
