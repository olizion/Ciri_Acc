import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  subtext?: string;
  iconBg?: string;
  iconColor?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  iconBg = "bg-[var(--primary)]/10",
  iconColor = "text-[var(--primary)]"
}: StatCardProps) {
  return (
    <div className="flex items-center gap-4">
      <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", iconBg)}>
        <Icon className={cn("size-5", iconColor)} />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-display text-xl font-bold">{value}</p>
        {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
      </div>
    </div>
  );
}
