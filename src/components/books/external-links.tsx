"use client";
import { ExternalLink } from "lucide-react";
import { toSafeYoutubeEmbedUrl } from "@/lib/utils";
import { recordLinkClick } from "@/app/(main)/books/actions";

interface ExternalLinksProps {
  postId: string;
  summaryUrl?: string | null;
  youtubeUrl?: string | null;
  amazonUrl?: string | null;
  referenceUrl?: string | null;
}

// URLが登録されているボタンのみ表示。クリックはKPI計測用にログを残す
export function ExternalLinks({ postId, summaryUrl, youtubeUrl, amazonUrl, referenceUrl }: ExternalLinksProps) {
  const embedUrl = toSafeYoutubeEmbedUrl(youtubeUrl);

  const links = [
    { url: summaryUrl, label: "要約サイトを見る", type: "summary" as const },
    { url: amazonUrl, label: "Amazonで本を見る", type: "amazon" as const },
    { url: referenceUrl, label: "その他の参考サイトを見る", type: "reference" as const },
  ].filter((l) => !!l.url);

  return (
    <div className="space-y-4">
      {embedUrl && (
        <div className="aspect-video w-full overflow-hidden rounded-lg border border-beige-200">
          <iframe
            src={embedUrl}
            title="YouTube解説動画"
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {youtubeUrl && !embedUrl && (
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => recordLinkClick(postId, "youtube")}
            className="flex items-center gap-1.5 rounded-full border border-beige-300 px-3 py-1.5 text-sm text-ink/70 hover:bg-beige-50"
          >
            <ExternalLink size={14} /> YouTubeで解説を見る
          </a>
        )}
        {links.map((link) => (
          <a
            key={link.type}
            href={link.url!}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => recordLinkClick(postId, link.type)}
            className="flex items-center gap-1.5 rounded-full border border-beige-300 px-3 py-1.5 text-sm text-ink/70 hover:bg-beige-50"
          >
            <ExternalLink size={14} /> {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}
