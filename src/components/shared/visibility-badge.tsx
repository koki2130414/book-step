import { Badge } from "@/components/ui/badge";
import { VISIBILITY_LABELS } from "@/lib/utils";
import { Globe, Users, Lock } from "lucide-react";
import type { VisibilityLevel } from "@/types/database";

const ICON: Record<VisibilityLevel, React.ElementType> = {
  public: Globe,
  friends_only: Users,
  private: Lock,
};

export function VisibilityBadge({ visibility }: { visibility: VisibilityLevel }) {
  const Icon = ICON[visibility];
  return (
    <Badge variant="outline" className="gap-1">
      <Icon size={12} />
      {VISIBILITY_LABELS[visibility]}
    </Badge>
  );
}
