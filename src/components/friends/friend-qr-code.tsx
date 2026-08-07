"use client";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";

interface FriendQrCodeProps {
  username: string;
}

// 自分の「友達追加URL」をQRコードとして表示する。
// 相手のカメラアプリで読み取っても /friends/add/[username] に直接飛べるURLをエンコードしている
export function FriendQrCode({ username }: FriendQrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [addUrl, setAddUrl] = useState("");

  useEffect(() => {
    const url = `${window.location.origin}/friends/add/${encodeURIComponent(username)}`;
    setAddUrl(url);
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 220,
        margin: 1,
        color: { dark: "#2C4A34", light: "#FEFDFB" },
      }).catch((err) => console.error("QRコードの生成に失敗しました:", err));
    }
  }, [username]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(addUrl);
    setCopied(true);
    showToast("リンクをコピーしました");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-lg border border-beige-200 bg-paper p-4">
        <canvas ref={canvasRef} />
      </div>
      <p className="text-sm text-ink/60">@{username} のQRコードです。友達に読み取ってもらいましょう。</p>
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1.5 rounded-full border border-beige-300 px-3 py-1.5 text-sm text-ink/70 hover:bg-beige-50"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        リンクをコピー
      </button>
    </div>
  );
}
