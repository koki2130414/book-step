"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import { Camera, AlertCircle } from "lucide-react";

// カメラ映像からQRコードをリアルタイム解析し、
// /friends/add/[username] へのURLを検出したら自動的にそのページへ遷移する
export function QrScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrameId: number;
    let cancelled = false;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          tick();
        }
      } catch {
        setError("カメラにアクセスできませんでした。ブラウザの設定でカメラへのアクセスを許可してください。");
      }
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || cancelled) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code?.data) {
            handleDetected(code.data);
            return;
          }
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    }

    function handleDetected(data: string) {
      setScanning(false);
      try {
        const url = new URL(data);
        // 同一オリジンの /friends/add/[username] 形式のみ受け付ける(不正なリンクへの誘導を防ぐ)
        if (url.pathname.startsWith("/friends/add/")) {
          router.push(url.pathname);
          return;
        }
      } catch {
        // URL形式でない場合はユーザー名そのものとして扱う
        if (/^[a-zA-Z0-9_]{3,20}$/.test(data)) {
          router.push(`/friends/add/${encodeURIComponent(data)}`);
          return;
        }
      }
      setError("読み取ったQRコードはBOOK STEPの友達追加コードではありませんでした。");
      setScanning(true);
      animationFrameId = requestAnimationFrame(tick);
    }

    startCamera();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrameId);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [router]);

  return (
    <div className="space-y-3">
      <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-lg border border-beige-200 bg-ink/5">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline aria-label="QRコードスキャン用カメラ映像" />
        <canvas ref={canvasRef} className="hidden" />
        {scanning && !error && (
          <div className="pointer-events-none absolute inset-8 rounded-lg border-2 border-forest-500/70" />
        )}
      </div>
      {error ? (
        <p className="flex items-center justify-center gap-1.5 text-center text-sm text-destructive">
          <AlertCircle size={14} /> {error}
        </p>
      ) : (
        <p className="flex items-center justify-center gap-1.5 text-center text-sm text-ink/50">
          <Camera size={14} /> 友達のQRコードにカメラを向けてください
        </p>
      )}
    </div>
  );
}
