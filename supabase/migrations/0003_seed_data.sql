-- =============================================================
-- BOOK STEP: サンプルデータ(開発確認用)
-- 実在の人物・書籍情報は使用せず、架空のデータのみを使用しています
-- 注意: profiles は auth.users と連動するため、本ファイルは
-- Supabaseダッシュボードで以下のテストユーザーを作成した後に実行してください:
--   taro@example.com / niimi_hanako@example.com / kenji_test@example.com
-- (README「テスト用アカウントの作成方法」参照)
-- =============================================================

-- ジャンル マスタ
insert into genres (name, slug, sort_order) values
  ('ビジネス', 'business', 1),
  ('自己啓発', 'self-help', 2),
  ('教育', 'education', 3),
  ('心理学', 'psychology', 4),
  ('農業', 'agriculture', 5),
  ('スポーツ', 'sports', 6),
  ('小説', 'novel', 7)
on conflict (slug) do nothing;

-- 書籍サンプル(architecture: 実在の出版物名は避け、架空のタイトルにしています)
insert into books (id, title, author, isbn13, cover_image_url, publisher, published_date, description, page_count, genre_id, external_source)
select
  uuid_generate_v4(), v.title, v.author, v.isbn13, v.cover, v.publisher, v.pub_date::date, v.description, v.pages,
  (select id from genres where slug = v.genre_slug), 'manual'
from (values
  ('小さな習慣が未来を変える', '架空 太郎', '9784000000001', null, 'サンプル出版', '2023-04-01', '毎日の小さな行動が複利のように積み上がる仕組みを解説するビジネス書。', 248, 'business'),
  ('自分を動かす技術', '架空 花子', '9784000000002', null, 'サンプル出版', '2022-09-15', '行動科学の知見をもとに、先延ばしを克服する方法をまとめた自己啓発書。', 192, 'self-help'),
  ('教室の中の探究学習', '架空 健二', '9784000000003', null, '学びの出版社', '2024-01-20', '探究型の授業設計について現場の実践例とともに紹介する教育書。', 210, 'education'),
  ('感情と向き合う心理学入門', '架空 美咲', '9784000000004', null, 'こころ書房', '2021-11-05', '感情のメカニズムをやさしく解説する心理学の入門書。', 176, 'psychology'),
  ('土から学ぶ農業経営', '架空 隆', '9784000000005', null, '大地出版', '2023-03-10', '米作りを中心にした小規模農業の経営ノウハウをまとめた一冊。', 220, 'agriculture'),
  ('勝負強さをつくるメンタル論', '架空 蹴人', '9784000000006', null, 'スポーツ新書', '2022-06-01', 'サッカー選手のメンタルトレーニング事例を紹介するスポーツ書。', 160, 'sports'),
  ('次の一歩', '架空 一歩', '9784000000007', null, '物語書房', '2020-10-01', '挫折から再び歩き出す青年を描いた長編小説。', 320, 'novel')
) as v(title, author, isbn13, cover, publisher, pub_date, description, pages, genre_slug)
on conflict do nothing;

-- ---------------------------------------------------------------
-- 以下はサンプルユーザーが作成済みであることを前提としたシードです。
-- auth.users が存在しない環境では profiles への insert はスキップしてください。
-- 実運用では、Supabaseダッシュボードでユーザー作成後、
-- 生成された user id を下記のクエリのuser_idに置き換えて実行します。
-- ---------------------------------------------------------------

-- 例: プロフィールの補足情報を更新(トリガーで自動作成された行に追記)
-- update profiles set bio = '週末は田んぼと本と過ごしています。', favorite_genres = array['農業','自己啓発']
-- where username = 'taro_sample';

-- コメント: 実際の投稿・いいね・コメントのサンプルはテストユーザー作成後、
-- アプリのUIから登録する運用を推奨します(READMEの「テスト用アカウントの作成方法」参照)。
