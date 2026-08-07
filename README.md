# BOOK STEP

**「一冊の本から、次の一歩が始まる。」**

読んだ本の学びを記録し、友達と共有できるソーシャル読書アプリのMVPです。
アプリ名・コンセプトは `src/lib/constants.ts` を編集するだけで変更できます。

## 目次

1. [技術構成](#技術構成)
2. [ローカル起動手順](#ローカル起動手順)
3. [Supabaseセットアップ手順](#supabaseセットアップ手順)
4. [Googleログイン設定手順](#googleログイン設定手順)
5. [外部書籍API設定手順](#外部書籍api設定手順)
6. [管理者設定手順](#管理者設定手順)
7. [テスト用アカウントの作成方法](#テスト用アカウントの作成方法)
8. [Vercelデプロイ手順](#vercelデプロイ手順)
9. [ディレクトリ構成](#ディレクトリ構成)
10. [MVPとして置いた前提・仮定](#mvpとして置いた前提仮定)
11. [フェーズ2(未実装・今後の拡張予定)](#フェーズ2未実装今後の拡張予定)
12. [よくあるエラーと解決方法](#よくあるエラーと解決方法)

---

## 技術構成

- Next.js 14 (App Router) / TypeScript / Tailwind CSS
- shadcn/ui 風の自作UIコンポーネント(Radix UI ベース)
- Supabase (Auth / Database / RLS)
- React Hook Form + Zod
- Vitest(ユニットテスト)

## ローカル起動手順

```bash
npm install
cp .env.example .env.local   # 値はSupabaseセットアップ手順を参照して埋める
npm run dev
```

`http://localhost:3000` で起動します。

以下のコマンドが正常に通ることを確認済みです。

```bash
npm run lint     # ESLint(next/core-web-vitals)
npm run build    # 本番ビルド
npm run test     # Vitest(ユニットテスト)
```

---

## Supabaseセットアップ手順

1. [Supabase](https://supabase.com) で新規プロジェクトを作成します。
2. `Project Settings > API` から以下を取得し、`.env.local` に設定します。
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`(サーバー専用。**絶対にクライアントに公開しない**)
3. SupabaseダッシュボードのSQL Editorで、`supabase/migrations/` 配下のファイルを **番号順に** 実行します。
   1. `0001_init_schema.sql` — テーブル・ENUM・トリガーの作成
   2. `0002_rls_policies.sql` — Row Level Securityポリシーの設定
   3. `0003_seed_data.sql` — ジャンル・サンプル書籍データの投入
4. `Authentication > URL Configuration` で以下を設定します。
   - Site URL: `http://localhost:3000`(本番では実際のドメイン)
   - Redirect URLs: `http://localhost:3000/auth/callback` を追加

### Supabase CLIを使う場合(任意)

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

---

## Googleログイン設定手順

1. [Google Cloud Console](https://console.cloud.google.com/) で新規プロジェクトを作成(または既存を利用)。
2. `APIとサービス > 認証情報` から「OAuthクライアントID」を作成(種類: ウェブアプリケーション)。
3. 承認済みのリダイレクトURIに、SupabaseダッシュボードのAuth設定に表示される
   コールバックURL(例: `https://<project-ref>.supabase.co/auth/v1/callback`)を追加します。
4. 発行された クライアントID / クライアントシークレット を、
   Supabaseダッシュボードの `Authentication > Providers > Google` に入力し、有効化します。
5. アプリ側の追加設定は不要です(`src/app/(auth)/login/login-form.tsx` が
   `supabase.auth.signInWithOAuth({ provider: "google" })` を呼び出す構成になっています)。

---

## 外部書籍API設定手順

ISBN・タイトル・著者名からの自動入力は `src/app/api/books/search-external/route.ts` が担当します。

- **Google Books API**(推奨): `GOOGLE_BOOKS_API_KEY` を設定すると利用可能になります。
  [Google Cloud ConsoleでBooks APIを有効化](https://console.cloud.google.com/apis/library/books.googleapis.com)し、
  APIキーを発行して `.env.local` に設定してください。**未設定でも動作します**(無料枠の範囲でAPIキーなしでも一定数リクエスト可能)。
- **OpenBD**: ISBN検索時の補助として利用しており、APIキー不要です。
- どちらのAPIでも情報が見つからない場合は、フォームから手動で入力できます。

---

## 管理者設定手順

新規登録したユーザーは全員 `role = 'user'` で作成されます。管理者にするには、
Supabaseダッシュボードの `Table Editor > profiles` から対象ユーザーの `role` を
`admin` に変更してください。

```sql
update profiles set role = 'admin' where username = '対象のユーザー名';
```

管理者は `/admin` にアクセスでき、設定画面(`/settings`)にも管理画面へのリンクが表示されます。
非管理者が `/admin` 配下にアクセスした場合はホームへリダイレクトされ、
さらにRLS側でも管理者判定(`is_admin()`関数)を行っているため、二重に保護されています。

---

## テスト用アカウントの作成方法

1. アプリの `/signup` から通常の新規登録フローで2〜3個のテストアカウントを作成します。
   (例: `taro@example.com` / `hanako@example.com` / `kenji@example.com`)
2. Supabaseの `Authentication > Email Templates` で確認メールを無効化しておくと、
   開発中の動作確認がスムーズです(`Confirm email` をオフ)。
3. お互いを友達に追加すると、友達限定投稿や「同じ本を読んだ友達」機能を確認できます。
4. 管理者アカウントが必要な場合は、上記「管理者設定手順」に従って `role` を変更してください。

---

## Vercelデプロイ手順

1. GitHubリポジトリにプッシュし、[Vercel](https://vercel.com) でインポートします。
2. Framework Preset は `Next.js` を選択(自動検出されます)。
3. `Environment Variables` に `.env.example` と同じキーを設定します。
   - `NEXT_PUBLIC_SITE_URL` は本番のドメイン(例: `https://book-step.vercel.app`)に変更してください。
4. デプロイ後、Supabaseダッシュボードの `Authentication > URL Configuration` に
   本番URLと `https://<your-domain>/auth/callback` を追加してください。
5. Google Cloud ConsoleのOAuthクライアントにも、本番ドメインからのリダイレクトURIを追加します。

---

## ディレクトリ構成

```
src/
  app/
    page.tsx                    # トップページ(未ログイン向け)
    (auth)/login, signup, reset-password
    auth/callback/route.ts      # OAuth・メールリンクのコールバック
    (main)/                     # ログイン必須エリア(共通レイアウトあり)
      home, search, shelf, friends, profile, notifications, goals, settings
      books/new, books/[id], books/[id]/edit
      admin/                    # 管理者専用
    api/
      books/search-external     # 外部書籍APIプロキシ
      friends/search, search    # 検索API
  components/
    ui/          # shadcn/ui風の基本コンポーネント
    books/       # 本関連(カード・フォーム・いいね・コメント等)
    friends/     # 友達関連
    profile/     # プロフィール関連
    admin/       # 管理画面関連
    layout/      # ヘッダー・下部ナビゲーション
    shared/      # 空状態・スケルトン・星評価等
  lib/
    supabase/    # クライアント/サーバー用Supabaseクライアント
    data/        # データ取得関数(サーバーコンポーネント用)
    validations/ # Zodスキーマ
    utils.ts, constants.ts
  types/database.ts             # ドメイン型定義
supabase/migrations/             # スキーマ・RLS・シードSQL
```

---

## MVPとして置いた前提・仮定

要件で「不明点は開発を止めずに合理的な仮定を置く」とのご指示のため、以下の判断を行いました。

- **書籍情報の編集不可**: 一度登録した本(タイトル・著者等)は、複数ユーザーで共有される
  マスタデータのため、読書記録の編集画面からは変更できない仕様にしました。誤って登録した場合は
  削除して登録し直す運用を想定しています。
- **プロフィール画像**: Supabase Storageへの直接アップロードUIは実装せず、
  画像URLを直接入力する形にしています(Storage連携はフェーズ2で追加しやすい構成です)。
- **フォロー機能**: `follows` テーブルとRLSポリシーのみ用意し、UIは実装していません(要件通り)。
- **サブスクリプション**: `subscriptions` テーブルのみ用意し、Stripe連携・課金UIは未実装です。
- **通知の作成**: DB外部からのinsertは許可せず、友達申請・承認時にサーバーアクション内で
  `notifications` へinsertする実装にしています。いいね・コメント時の通知作成は
  同様のパターンで追加可能な構成にしていますが、MVPでは友達関連の通知のみ実装済みです。
- **フォント読み込み**: `next/font/google` はビルド時にGoogle Fontsへネットワークアクセスが
  必要で、ネットワーク制限のある環境ではビルドが失敗するため、通常の `<link>` タグでの
  読み込みに変更しています(ブラウザ側での読み込みになるため、ビルドの安定性を優先しました)。
- **サンプルデータ**: `profiles` は `auth.users` と連動するため、実際のユーザー作成前に
  投稿・コメント・いいねのサンプルを投入することができません。ジャンルと書籍マスタのみ
  シードし、投稿サンプルはテストアカウント作成後にUIから登録する運用としています。
- **通報**: 投稿詳細画面から理由・詳細を添えて通報でき、管理画面の通報一覧(`/admin/reports`)から
  対応済み/却下の処理ができます。コメント単位・ユーザー単位の通報もServer Action側は対応済みですが、
  UIボタンは投稿単位のみ実装しています。

---

## フェーズ2(今回追加実装した項目)

続けての開発依頼を受け、以下のフェーズ2項目も実装しました。

- **通報機能**: 投稿詳細画面に「通報する」ボタンを追加し、`reports` テーブルに保存 → 管理画面の通報一覧から対応できます。
- **ダークモード**: 設定画面のトグルで切り替え可能。`localStorage` に保存し、次回訪問時も維持されます(CSS変数ベースの実装のため、配色トークンを変更するだけで全画面に反映されます)。
- **PWA対応**: `public/sw.js` でService Workerを登録し、静的アセットのキャッシュとオフライン時の案内ページ(`public/offline.html`)を用意しました。ホーム画面に追加すると `manifest.json` の設定でアプリらしく起動します。
- **おすすめ本**: ホーム画面に、全体公開かつ評価の高い投稿から自分が未登録の本をピックアップする「おすすめの本」セクションを追加しました(高度な協調フィルタリング等ではなく、MVPとしてシンプルな評価順選定です)。
- **データ分析(KPI)ダッシュボード**: `/admin/analytics` で、総ユーザー数・直近30日の新規登録・投稿数・コメント数・いいね数・外部リンククリック数(要約サイト/YouTube/Amazon/その他)を確認できます。
- **友達追加の拡張**: `/friends` に「IDで追加」「QRコード」タブを追加しました。
  - **IDで追加**: 相手のユーザー名(@のあとの部分)を直接入力し、確認画面(`/friends/add/[username]`)でプロフィールを確認してから申請できます。
  - **QRコード交換**: 自分のQRコードを表示(`qrcode`ライブラリでその場生成、`/friends/add/[username]`へのURLをエンコード)し、相手はアプリ内カメラスキャナー(`jsqr`でクライアント側デコード、サーバーには画像を送信しません)で読み取ると、自動的に確認画面へ遷移します。スマートフォン標準のカメラアプリで読み取ってもURLとして開けます。

## フェーズ2(未実装・今後の拡張予定)

- `public/icons/icon-192.png` / `icon-512.png` は未生成のため、実際のロゴ画像に差し替えてください(`manifest.json` は設定済み)
- Supabase Storageを使ったプロフィール画像・表紙画像のアップロードUI(現状はURL直接入力)
- より高度なおすすめアルゴリズム(協調フィルタリング等)
- 週次/月次アクティブ率など、ログインイベントの記録が前提となるKPI
- AIによる要約・感想整理機能(著作権保護の観点から現時点では実装していません)

---

## よくあるエラーと解決方法

| 症状 | 原因 / 対処法 |
| --- | --- |
| ログイン後すぐ `/login` にリダイレクトされる | `.env.local` の `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` が未設定・誤りの可能性があります。Supabaseダッシュボードの値と一致しているか確認してください。 |
| 本を登録すると「この本は既に登録済みです」と表示される | `reading_posts` の `(user_id, book_id)` にUNIQUE制約があるため、同じ本を同じユーザーが二重登録できない仕様です。マイ本棚から編集してください。 |
| Googleログインが `redirect_uri_mismatch` エラーになる | Google Cloud ConsoleのOAuthクライアントに、Supabaseのコールバック URL(`https://<project-ref>.supabase.co/auth/v1/callback`)が正しく登録されているか確認してください。 |
| 友達限定投稿が友達にも表示されない | `friendships.status` が `accepted` になっているか確認してください(申請中 `pending` の間は非公開のままです)。 |
| 外部書籍検索で結果が0件になる | `GOOGLE_BOOKS_API_KEY` 未設定時はISBNのみOpenBDでも検索します。ISBN以外のキーワードで0件の場合は手動入力に切り替えてください。 |
| `npm run build` でGoogle Fontsのエラーが出る | ネットワーク制限のある環境向けに、フォントは `<link>` タグ読み込み方式にしているため通常は発生しません。もし発生する場合は `src/app/layout.tsx` のフォント読み込み部分を確認してください。 |
| 管理画面にアクセスできない | `profiles.role` が `admin` になっているか確認してください(「管理者設定手順」参照)。 |
