"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Send, BookOpen, Loader2, ArrowLeft, X } from "lucide-react";
import { sendMessage } from "@/app/(main)/messages/actions";

interface BookRef {
  id: string;
  title: string;
  author: string;
  cover_image_url?: string | null;
}
interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string | null;
  book_id: string | null;
  created_at: string;
  book?: BookRef | null;
}
interface ShelfBook {
  id: string;
  title: string;
  author: string;
}
interface ChatThreadProps {
  meId: string;
  partner: { id: string; username: string; displayName: string };
  initialMessages: Message[];
  shelfBooks: ShelfBook[];
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// 友達との1対1チャット。数秒ごとに新着を取得し、テキストと本のおすすめを送れる
export function ChatThread({ meId, partner, initialMessages, shelfBooks }: ChatThreadProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [attachedBook, setAttachedBook] = useState<ShelfBook | null>(null);
  const [isSending, startSend] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?with=${partner.id}`, { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      if (Array.isArray(json.messages)) setMessages(json.messages);
    } catch {
      // ネットワーク一時失敗は無視して次のポーリングに任せる
    }
  }, [partner.id]);

  useEffect(() => {
    const t = setInterval(poll, 4000);
    return () => clearInterval(t);
  }, [poll]);

  const submit = () => {
    const body = text.trim();
    if ((!body && !attachedBook) || isSending) return;
    const bookId = attachedBook?.id ?? null;
    startSend(async () => {
      const res = await sendMessage(partner.id, body, bookId);
      if (res.ok) {
        setText("");
        setAttachedBook(null);
        await poll();
      }
    });
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-9rem)] max-w-2xl flex-col">
      <div className="flex items-center gap-2 border-b border-beige-200 pb-3">
        <Link href="/messages" className="rounded-full p-1 text-ink/60 hover:bg-beige-100">
          <ArrowLeft size={18} />
        </Link>
        <Link
          href={`/profile/${partner.username}`}
          className="font-display font-semibold text-ink hover:underline"
        >
          {partner.displayName}
        </Link>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto py-4">
        {messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-ink/50">
            メッセージはまだありません。最初の一言を送ってみましょう。
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === meId;
          return (
            <div key={m.id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
              {!mine && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-100 text-sm font-semibold text-forest-700">
                  {partner.displayName?.charAt(0) ?? "?"}
                </div>
              )}
              <div className="flex max-w-[78%] flex-col gap-1">
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed shadow-sm ${
                    mine ? "bg-forest-600 text-paper" : "border border-beige-200 bg-white text-ink"
                  }`}
                >
                  {m.book && (
                    <div
                      className={`mb-1.5 flex items-center gap-2.5 rounded-lg p-2 ${
                        mine ? "bg-forest-700" : "border border-beige-200 bg-beige-50"
                      }`}
                    >
                      {m.book.cover_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.book.cover_image_url}
                          alt=""
                          className="h-16 w-11 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div
                          className={`flex h-16 w-11 shrink-0 items-center justify-center rounded ${
                            mine ? "bg-forest-600 text-paper/80" : "bg-beige-100 text-beige-300"
                          }`}
                        >
                          <BookOpen size={18} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className={`text-[11px] font-medium ${mine ? "text-paper/80" : "text-forest-700"}`}>
                          おすすめの本
                        </p>
                        <p className={`truncate text-sm font-semibold ${mine ? "text-paper" : "text-ink"}`}>
                          {m.book.title}
                        </p>
                        <p className={`truncate text-xs ${mine ? "text-paper/70" : "text-ink/50"}`}>
                          {m.book.author}
                        </p>
                      </div>
                    </div>
                  )}
                  {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                </div>
                <span className={`px-1 text-[11px] text-ink/50 ${mine ? "text-right" : "text-left"}`}>
                  {timeLabel(m.created_at)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {attachedBook && (
        <div className="mb-2 flex items-center gap-2 rounded-md border border-beige-200 bg-beige-50 p-2 text-sm">
          <BookOpen size={16} className="shrink-0 text-forest-600" />
          <span className="flex-1 truncate">
            {attachedBook.title} <span className="text-ink/50">{attachedBook.author}</span>
          </span>
          <button type="button" onClick={() => setAttachedBook(null)} aria-label="本の添付を外す">
            <X size={15} className="text-ink/50" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-beige-200 pt-3">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          aria-label="本をすすめる"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-beige-300 text-forest-700 hover:bg-beige-50"
        >
          <BookOpen size={18} />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="メッセージを入力..."
          className="flex-1 rounded-full border border-beige-300 bg-paper px-4 py-2 text-sm outline-none focus:border-forest-600"
        />
        <button
          type="button"
          onClick={submit}
          disabled={isSending || (!text.trim() && !attachedBook)}
          aria-label="送信"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-600 text-paper disabled:opacity-50"
        >
          {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>

      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="max-h-[70vh] w-full max-w-md overflow-y-auto rounded-lg bg-paper p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display font-semibold text-ink">すすめる本を選ぶ</h3>
              <button type="button" onClick={() => setPickerOpen(false)} aria-label="閉じる">
                <X size={18} className="text-ink/50" />
              </button>
            </div>
            {shelfBooks.length === 0 ? (
              <p className="text-sm text-ink/50">本棚に本がありません。先に本を登録してください。</p>
            ) : (
              <ul className="space-y-1">
                {shelfBooks.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachedBook(b);
                        setPickerOpen(false);
                      }}
                      className="w-full rounded-md p-2 text-left text-sm hover:bg-beige-50"
                    >
                      <span className="font-medium text-ink">{b.title}</span>{" "}
                      <span className="text-ink/50">{b.author}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
