import { createClient } from "@/lib/supabase/server";
import { ReportRowActions } from "@/components/admin/report-row-actions";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";

export default async function AdminReportsPage() {
  const supabase = createClient();
  const { data: reports } = await supabase
    .from("reports")
    .select("*, reporter:profiles!reports_reporter_id_fkey(*)")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold text-ink">通報一覧</h1>
      {!reports || reports.length === 0 ? (
        <EmptyState title="未対応の通報はありません" />
      ) : (
        <ul className="space-y-3">
          {(reports as any[]).map((r) => (
            <li key={r.id} className="space-y-2 rounded-lg border border-beige-200 p-4">
              <div className="flex items-center justify-between text-xs text-ink/50">
                <span>{r.target_type} を通報 ・ {formatDate(r.created_at)}</span>
                <span>報告者: {r.reporter?.display_name}</span>
              </div>
              <p className="text-sm text-ink"><strong>理由:</strong> {r.reason}</p>
              {r.description && <p className="text-sm text-ink/70">{r.description}</p>}
              <ReportRowActions reportId={r.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
