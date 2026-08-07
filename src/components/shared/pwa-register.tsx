"use client";
import { useEffect } from "react";

// PWA用のService Worker登録。ホーム画面に追加した際のオフライン起動を補助する
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("Service Workerの登録に失敗しました:", err);
      });
    }
  }, []);

  return null;
}
