"use client";
import { useRef, useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, Loader2, Upload, ImageIcon } from "lucide-react";
import { readingPostSchema, type ReadingPostInput } from "@/lib/validations/book";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StarRating } from "@/components/shared/star-rating";
import { useToast } from "@/components/ui/toast-provider";
import type { Genre } from "@/types/database";

interface BookFormProps {
  genres: Genre[];
  defaultValues?: Partial<ReadingPostInput>;
  isEdit?: boolean;
  onSubmitAction: (values: ReadingPostInput) => Promise<void>;
}

interface ExternalResult {
  title: string;
  author: string;
  isbn10?: string;
  isbn13?: string;
  coverImageUrl?: string;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  source?: string;
}

// 本の登録・編集で共用するフォーム。編集時は書籍情報(タイトル等)を読み取り専用にする
export function BookForm({ genres, defaultValues, isEdit = false, onSubmitAction }: BookFormProps) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ExternalResult[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReadingPostInput>({
    resolver: zodResolver(readingPostSchema),
    defaultValues: {
      readingStatus: "want_to_read",
      visibility: "friends_only",
      ...defaultValues,
    },
  });

  const rating = watch("rating") ?? 0;
  const coverImageUrl = watch("coverImageUrl");

  // 端末内の画像をSupabase Storageにアップロードし、表紙画像URLとしてセットする。
  // 外部検索で表紙が見つからない本に、自分で表紙を追加できるようにする。
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 同じファイルを選び直せるようリセット
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("画像ファイルを選択してください", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("画像サイズは5MBまでにしてください", "error");
      return;
    }
    setIsUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        showToast("ログインが必要です", "error");
        return;
      }
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("book-covers")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) {
        showToast(`アップロードに失敗しました: ${error.message}`, "error");
        return;
      }
      const { data } = supabase.storage.from("book-covers").getPublicUrl(path);
      setValue("coverImageUrl", data.publicUrl, { shouldValidate: true });
      showToast("表紙画像をアップロードしました");
    } catch {
      showToast("アップロードに失敗しました", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleExternalSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch(`/api/books/search-external?q=${encodeURIComponent(searchQuery)}`);
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error ?? "検索に失敗しました", "error");
        return;
      }
      setSearchResults(json.results ?? []);
      if ((json.results ?? []).length === 0) {
        showToast("該当する本が見つかりませんでした。手動で入力してください。", "info");
      }
    } catch {
      showToast("外部書籍APIへの接続に失敗しました。手動で入力してください。", "error");
    } finally {
      setIsSearching(false);
    }
  };

  const applyResult = (result: ExternalResult) => {
    setValue("title", result.title);
    setValue("author", result.author);
    if (result.isbn13 || result.isbn10) setValue("isbn", result.isbn13 ?? result.isbn10 ?? "");
    if (result.coverImageUrl) setValue("coverImageUrl", result.coverImageUrl);
    if (result.publisher) setValue("publisher", result.publisher);
    if (result.publishedDate) setValue("publishedDate", result.publishedDate);
    if (result.description) setValue("description", result.description);
    if (result.pageCount) setValue("pageCount", result.pageCount);
    setSearchResults([]);
    if (result.source === "ai") {
      showToast("AIが推定した情報です。内容を確認してから登録してください", "info");
    } else {
      showToast("書籍情報を反映しました");
    }
  };

  const onSubmit = (values: ReadingPostInput) => {
    setFormError(null);
    startTransition(async () => {
      try {
        await onSubmitAction(values);
      } catch (e) {
        setFormError(e instanceof Error ? e.message : "登録に失敗しました");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
      {!isEdit && (
        <section className="space-y-3 rounded-lg border border-beige-200 bg-beige-50/60 p-4">
          <Label htmlFor="external-search">ISBN・タイトル・著者名で検索</Label>
          <div className="flex gap-2">
            <Input
              id="external-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="例: 9784000000001 または 本のタイトル"
            />
            <Button type="button" onClick={handleExternalSearch} disabled={isSearching} variant="secondary">
              {isSearching ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
              検索
            </Button>
          </div>
          {searchResults.length > 0 && (
            <ul className="space-y-2">
              {searchResults.map((r, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => applyResult(r)}
                    className="flex w-full items-center gap-3 rounded-md border border-beige-200 bg-paper p-2 text-left text-sm hover:bg-beige-50"
                  >
                    <span className="font-medium">{r.title}</span>
                    <span className="text-ink/50">{r.author}</span>
                    {r.source === "ai" && (
                      <span className="ml-auto shrink-0 rounded border border-beige-300 bg-beige-100 px-1.5 py-0.5 text-[10px] text-ink/60">
                        AI推定
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-ink/50">APIで見つからない場合は、下記フォームに手動で入力できます。</p>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="font-display font-semibold text-ink">書籍情報</h2>
        <p className="text-xs text-ink/50">すべて任意項目です。あとで編集して埋めることもできます。</p>

        <div className="space-y-1.5">
          <Label>表紙画像</Label>
          <div className="flex items-start gap-4">
            {coverImageUrl ? (
              // Supabase等の任意ホストを扱うため、プレビューは素のimgを使用する
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverImageUrl}
                alt="表紙プレビュー"
                className="h-32 w-24 rounded-md border border-beige-200 object-cover"
              />
            ) : (
              <div className="flex h-32 w-24 items-center justify-center rounded-md border border-dashed border-beige-300 text-beige-300">
                <ImageIcon size={24} />
              </div>
            )}
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                {coverImageUrl ? "画像を変更" : "画像をアップロード"}
              </Button>
              {coverImageUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setValue("coverImageUrl", "", { shouldValidate: true })}
                  disabled={isUploading}
                  className="ml-2"
                >
                  画像を削除
                </Button>
              )}
              <p className="text-xs text-ink/50">
                JPG・PNGなど、5MBまで。検索で表紙が見つからない本に、自分で表紙を追加できます。
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="title">本のタイトル</Label>
            <Input id="title" {...register("title")} disabled={isEdit} placeholder="未入力でも登録できます" />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="author">著者名</Label>
            <Input id="author" {...register("author")} disabled={isEdit} placeholder="未入力でも登録できます" />
            {errors.author && <p className="text-xs text-destructive">{errors.author.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="isbn">ISBN(任意)</Label>
            <Input id="isbn" {...register("isbn")} disabled={isEdit} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="publisher">出版社</Label>
            <Input id="publisher" {...register("publisher")} disabled={isEdit} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="genreId">ジャンル</Label>
            <Controller
              control={control}
              name="genreId"
              render={({ field }) => (
                <Select value={field.value ?? undefined} onValueChange={field.onChange} disabled={isEdit}>
                  <SelectTrigger id="genreId"><SelectValue placeholder="選択してください" /></SelectTrigger>
                  <SelectContent>
                    {genres.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pageCount">ページ数</Label>
            <Input id="pageCount" type="number" {...register("pageCount")} disabled={isEdit} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">本の概要</Label>
          <Textarea id="description" {...register("description")} rows={3} disabled={isEdit} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display font-semibold text-ink">読書記録</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="readingStatus">読書ステータス</Label>
            <Controller
              control={control}
              name="readingStatus"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="readingStatus"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="want_to_read">読みたい</SelectItem>
                    <SelectItem value="reading">読書中</SelectItem>
                    <SelectItem value="finished">読了</SelectItem>
                    <SelectItem value="paused">中断</SelectItem>
                    <SelectItem value="reread_wanted">再読したい</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="visibility">公開範囲</Label>
            <Controller
              control={control}
              name="visibility"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="visibility"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">全体公開</SelectItem>
                    <SelectItem value="friends_only">友達のみ</SelectItem>
                    <SelectItem value="private">非公開</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="startedAt">読み始めた日</Label>
            <Input id="startedAt" type="date" {...register("startedAt")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="finishedAt">読了日</Label>
            <Input id="finishedAt" type="date" {...register("finishedAt")} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>おすすめ度</Label>
          <StarRating value={rating} onChange={(v) => setValue("rating", v)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="summary">自分なりの要約</Label>
          <Textarea id="summary" {...register("summary")} rows={4} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="review">感想</Label>
          <Textarea id="review" {...register("review")} rows={4} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="learnings">学んだこと</Label>
          <Textarea id="learnings" {...register("learnings")} rows={3} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="actionItems">実践したいこと</Label>
          <Textarea id="actionItems" {...register("actionItems")} rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="memorableQuotes">印象に残った言葉</Label>
          <Textarea id="memorableQuotes" {...register("memorableQuotes")} rows={2} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display font-semibold text-ink">参考リンク(任意)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="summaryUrl">要約サイトURL</Label>
            <Input id="summaryUrl" {...register("summaryUrl")} placeholder="https://" />
            {errors.summaryUrl && <p className="text-xs text-destructive">{errors.summaryUrl.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="youtubeUrl">YouTube URL</Label>
            <Input id="youtubeUrl" {...register("youtubeUrl")} placeholder="https://" />
            {errors.youtubeUrl && <p className="text-xs text-destructive">{errors.youtubeUrl.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="amazonUrl">Amazon URL</Label>
            <Input id="amazonUrl" {...register("amazonUrl")} placeholder="https://" />
            {errors.amazonUrl && <p className="text-xs text-destructive">{errors.amazonUrl.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="referenceUrl">その他参考URL</Label>
            <Input id="referenceUrl" {...register("referenceUrl")} placeholder="https://" />
            {errors.referenceUrl && <p className="text-xs text-destructive">{errors.referenceUrl.message}</p>}
          </div>
        </div>
      </section>

      {formError && <p className="text-sm text-destructive">{formError}</p>}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "保存中..." : isEdit ? "更新する" : "登録する"}
      </Button>
    </form>
  );
}
