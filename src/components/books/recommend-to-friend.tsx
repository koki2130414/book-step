"use client";
import { useState, useTransition } from "react";
import { Share2, X, Loader2, Check } from "lucide-react";
import { sendMessage } from "@/app/(main)/messages/actions";
import { useToast } from "@/components/ui/toast-provider";

interface Friend {
  id: string;
  username: string;
  displayName: string;
}
interface RecommendToFriendProps {
  bookId: string;
  bookTitle: string;
  friends: Friend[];
}

// 本の詳細ページから、友達にこの本をDMでおすすめするボタン + ダイアログ
export function RecommendToFriend({ bookId, bookTitle, friends }: RecommendToFriendProps) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Friend | null>(null);
  const [message, setMessage] = useState("");
  const [isSending, startSend] = useTransition();
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  const send = () => {
    if (!selected || isSending) return;
    const target = selected;
    startSend(async () => {
      const body = message.trim() || `「${bookTitle}」おすすめだよ！`;
      const res = await sendMessage(target.id, body, bookId);
      if (res.ok) {
        setSentTo((prev) => new Set(prev).add(target.id));
        showToast(`${target.displayName}さんにおすすめしました`);
        setOpen(false);
        setSelected(null);
        setMessage("");
      } else {
        showToast(res.message || "送信に失敗しました", "error");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-forest-600 px-3 py-1.5 text-sm font-medium text-forest-700 hover:bg-forest-600 hover:text-paper"
      >
        <Share2 size={14} />
        友達にすすめる
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-lg bg-paper p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display font-semibold text-ink">友達にこの本をすすめる</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="閉じる">
                <X size={18} className="text-ink/50" />
              </button>
            </div>

            <p className="mb-3 text-sm text-ink/60">「{bookTitle}」</p>

            {friends.length === 0 ? (
              <p className="text-sm text-ink/50">まだ友達がいません。</p>
            ) : (
              <>
                <p className="mb-1 text-xs text-ink/50">送る相手</p>
                <ul className="mb-3 flex flex-wrap gap-2">
                  {friends.map((f) => {
                    const active = selected?.id === f.id;
                    return (
                      <li key={f.id}>
                        <button
                          type="button"
                          onClick={() => setSelected(f)}
                          className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm ${
                            active
                              ? "border-forest-600 bg-forest-600 text-paper"
                              : "border-beige-300 text-ink/70 hover:bg-beige-50"
                          }`}
                        >
                          {sentTo.has(f.id) && <Check size={13} />}
                          {f.displayName}
                        </button>
                      </li>
                    );
                  })}
                </ul>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  placeholder="ひとことメッセージ(任意)"
                  className="mb-3 w-full rounded-md border border-beige-300 bg-paper px-3 py-2 text-sm outline-none focus:border-forest-600"
                />

                <button
                  type="button"
                  onClick={send}
                  disabled={!selected || isSending}
                  className="flex w-full items-center justify-center gap-1.5 rounded-full bg-forest-600 px-4 py-2 text-sm font-medium text-paper disabled:opacity-50"
                >
                  {isSending ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
                  すすめる
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
