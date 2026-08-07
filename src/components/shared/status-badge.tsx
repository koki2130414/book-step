import { Badge } from "@/components/ui/badge";
import { READING_STATUS_LABELS } from "@/lib/utils";
import type { ReadingStatus } from "@/types/database";

const STATUS_STYLE: Record<ReadingStatus, string> = {
  want_to_read: "bg-beige-100 text-clay-600",
  reading: "bg-forest-100 text-forest-700",
  finished: "bg-forest-600 text-paper",
  paused: "bg-beige-200 text-ink/60",
  reread_wanted: "bg-clay-400/20 text-clay-600",
};

export function StatusBadge({ status }: { status: ReadingStatus }) {
  return <Badge className={STATUS_STYLE[status]}>{READING_STATUS_LABELS[status]}</Badge>;
}
