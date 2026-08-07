/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // 本の表紙画像はSupabase Storageまたは外部書籍APIから取得するため許可ドメインを設定
    remotePatterns: [
      { protocol: "https", hostname: "books.google.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "cover.openbd.jp" },
    ],
  },
  eslint: {
    // ビルド時のLintは npm run lint で別途実行する運用にする
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
