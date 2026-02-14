"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  WalletIcon,
  ReceiptIcon,
  CalendarClockIcon,
  BrainCircuitIcon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  icon: React.ReactNode;
  subtitle?: string;
  badge?: {
    text: string;
    variant: "default" | "destructive" | "secondary";
  };
  className?: string;
}

function KPICard({ title, value, trend, icon, subtitle, badge, className }: KPICardProps) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground flex items-center justify-between text-sm font-medium">
          <span className="flex items-center gap-2">
            {icon}
            {title}
          </span>
          {badge && (
            <Badge variant={badge.variant} className="text-xs">
              {badge.text}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="font-display text-3xl font-semibold tracking-tight">{value}</div>
          {trend && (
            <div
              className={cn(
                "flex items-center gap-1 text-sm",
                trend.isPositive ? "text-green-600" : "text-red-500"
              )}>
              {trend.isPositive ? (
                <TrendingUpIcon className="size-4" />
              ) : (
                <TrendingDownIcon className="size-4" />
              )}
              <span>{trend.value}</span>
              {subtitle && <span className="text-muted-foreground ml-1">{subtitle}</span>}
            </div>
          )}
          {!trend && subtitle && (
            <p className="text-muted-foreground text-sm">{subtitle}</p>
          )}
        </div>
      </CardContent>
      {/* Decorative gradient */}
      <div className="pointer-events-none absolute -right-6 -bottom-6 size-24 rounded-full bg-gradient-to-br from-[var(--primary)]/10 to-transparent blur-2xl" />
    </Card>
  );
}

export default function CiriKPICards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KPICard
        title="Banksaldo"
        value="kr 485 230"
        trend={{ value: "+12.5%", isPositive: true }}
        subtitle="vs. forrige måned"
        icon={<WalletIcon className="size-4" />}
      />
      <KPICard
        title="Resultat i år"
        value="kr 127 890"
        trend={{ value: "+8.2%", isPositive: true }}
        subtitle="vs. samme periode i fjor"
        icon={<TrendingUpIcon className="size-4" />}
      />
      <KPICard
        title="Utestående faktura"
        value="kr 34 500"
        badge={{ text: "2 forfalt", variant: "destructive" }}
        subtitle="Fra 3 kunder"
        icon={<ReceiptIcon className="size-4" />}
      />
      <KPICard
        title="Ciri har spart deg"
        value="18 timer"
        subtitle="Denne måneden"
        icon={<BrainCircuitIcon className="size-4" />}
        className="bg-gradient-to-br from-[var(--primary)]/5 to-transparent"
      />
    </div>
  );
}

export function UpcomingPaymentsCard() {
  const payments = [
    { name: "Leverandør AS", amount: "kr 12 500", dueDate: "I dag", isOverdue: true },
    { name: "Husleie", amount: "kr 25 000", dueDate: "Om 3 dager", isOverdue: false },
    { name: "Strøm", amount: "kr 4 200", dueDate: "Om 5 dager", isOverdue: false },
    { name: "Forsikring", amount: "kr 8 900", dueDate: "Om 12 dager", isOverdue: false }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClockIcon className="size-5" />
          Kommende betalinger
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {payments.map((payment, index) => (
            <div
              key={index}
              className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
              <div>
                <p className="font-medium">{payment.name}</p>
                <p
                  className={cn(
                    "text-sm",
                    payment.isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"
                  )}>
                  {payment.dueDate}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display font-semibold">{payment.amount}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
