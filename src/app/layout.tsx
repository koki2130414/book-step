import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/ui/toast-provider";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { PwaRegister } from "@/components/shared/pwa-register";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: `${APP_NAME} | ${APP_TAGLINE}`,
  description: "読んだ本の学びを記録し、友達と共有できるソーシャル読書アプリ",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: APP_NAME },
};

export const viewport: Viewport = {
  themeColor: "#2C4A34",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        {/* ダークモードのちらつき防止: React水和前にlocalStorage/OS設定を反映する */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var stored = localStorage.getItem('book-step-theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var isDark = stored ? stored === 'dark' : prefersDark;
                  if (isDark) document.documentElement.classList.add('dark');
                } catch (e) {}
              })();
            `,
          }}
        />
        {/*
          フォントは next/font/google ではなく通常の<link>で読み込んでいます。
          next/font はビルド時にGoogle Fontsへネットワークアクセスするため、
          ビルド環境によっては(社内ネットワーク制限など)ビルド自体が失敗することがあるためです。
          この方式ならビルドはオフラインでも成功し、フォントはブラウザ側で読み込まれます。
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Routerのroot layoutでは全ページ共通適用のため問題ない */}
        <link
          href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;600;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider>
          <ToastProvider>
            {children}
            <PwaRegister />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
