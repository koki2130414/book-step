import Link from "next/link";
import { BookOpen, PenLine, Users, Link2, Target, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

const FEATURES = [
  { icon: PenLine, title: "読書記録を残す", desc: "読んだ本のステータスや感想を、あとから見返せる形で記録できます。" },
  { icon: BookOpen, title: "自分なりの要約を書く", desc: "本の内容を自分の言葉でまとめ、理解を深めます。" },
  { icon: Users, title: "友達と本を共有する", desc: "友達が読んでいる本や感想を知り、次に読む本のヒントにできます。" },
  { icon: Link2, title: "要約サイトや動画を保存する", desc: "参考になったサイトやYouTube解説動画へのリンクをまとめて残せます。" },
  { icon: Target, title: "読書目標を管理する", desc: "月間・年間の目標冊数を設定し、進捗を追いかけられます。" },
];

const STEPS = [
  "アカウントを作成",
  "読んだ本を登録",
  "要約や感想を記録",
  "友達と共有",
  "学びを次の行動につなげる",
];

export default function TopPage() {
  return (
    <main className="min-h-screen bg-paper">
      {/* ファーストビュー */}
      <section className="border-b border-beige-200 bg-gradient-to-b from-beige-50 to-paper">
        <div className="container flex flex-col items-center gap-6 py-20 text-center">
          <span className="flex items-center gap-2 rounded-full bg-forest-100 px-4 py-1 text-sm font-medium text-forest-700">
            <BookOpen size={16} /> {APP_NAME}
          </span>
          <h1 className="max-w-2xl font-display text-3xl font-bold leading-snug text-ink md:text-5xl">
            {APP_TAGLINE}
          </h1>
          <p className="max-w-lg text-ink/70">
            読んだ本の学びを記録し、友達と共有できるソーシャル読書アプリ。
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup">無料で始める</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">ログイン</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 主な機能 */}
      <section className="container py-16">
        <h2 className="mb-10 text-center font-display text-2xl font-bold text-ink">主な機能</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex flex-col gap-3 rounded-lg border border-beige-200 p-5">
              <Icon className="text-forest-600" size={26} />
              <p className="font-display font-semibold text-ink">{title}</p>
              <p className="text-sm text-ink/60">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 利用の流れ */}
      <section className="border-t border-beige-200 bg-beige-50/60 py-16">
        <div className="container">
          <h2 className="mb-10 text-center font-display text-2xl font-bold text-ink">利用の流れ</h2>
          <ol className="mx-auto flex max-w-3xl flex-col gap-4">
            {STEPS.map((step, i) => (
              <li key={step} className="flex items-center gap-4 rounded-lg bg-paper p-4 shadow-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-600 text-sm font-semibold text-paper">
                  {i + 1}
                </span>
                <span className="text-ink">{step}</span>
                {i < STEPS.length - 1 && <ArrowRight className="ml-auto hidden text-beige-300 sm:block" size={18} />}
              </li>
            ))}
          </ol>
          <div className="mt-10 flex justify-center">
            <Button asChild size="lg">
              <Link href="/signup">無料で始める</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-beige-200 py-8 text-center text-xs text-ink/40">
        © {new Date().getFullYear()} {APP_NAME}
      </footer>
    </main>
  );
}
