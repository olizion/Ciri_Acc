"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BellIcon, ClockIcon } from "lucide-react";
import Link from "next/link";
import { useIsMobile } from "@/hooks/use-mobile";
import InvoiceTimelineDialog from "@/app/dashboard/bank/faktura/invoice-timeline-dialog";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { API_BASE_URL, COMPANY_ID } from "@/lib/api";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "akkurat nå";
  if (mins < 60) return `${mins} min siden`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}t siden`;
  const days = Math.floor(hours / 24);
  return `${days}d siden`;
}

const Notifications = () => {
  const isMobile = useIsMobile();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [timelineInvoiceId, setTimelineInvoiceId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/notifications?company_id=${COMPANY_ID}&limit=20`
      );
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.items);
      }
    } catch {
      // silent
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/notifications/unread-count?company_id=${COMPANY_ID}`
      );
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
      }
    } catch {
      // silent
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  // Poll unread count every 30s
  useEffect(() => {
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const markRead = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
        method: "POST",
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  };

  const markAllRead = async () => {
    try {
      await fetch(
        `${API_BASE_URL}/api/notifications/read-all?company_id=${COMPANY_ID}`,
        { method: "POST" }
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  };

  return (
    <>
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) fetchNotifications();
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button size="icon-sm" variant="ghost" className="relative">
          <BellIcon />
          {unreadCount > 0 && (
            <span className="bg-destructive absolute end-0.5 top-0.5 block size-1.5 shrink-0 rounded-full" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={isMobile ? "center" : "end"}
        className="ms-4 w-80 p-0"
      >
        <DropdownMenuLabel className="bg-background dark:bg-muted sticky top-0 z-10 p-0">
          <div className="flex justify-between border-b px-6 py-4">
            <div className="font-medium">Varsler</div>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="link"
                  className="h-auto p-0 text-xs"
                  size="icon-sm"
                  onClick={markAllRead}
                >
                  Merk alle lest
                </Button>
              )}
              <Button
                variant="link"
                className="h-auto p-0 text-xs"
                size="icon-sm"
                asChild
              >
                <Link href="/dashboard/varsler">Se alle</Link>
              </Button>
            </div>
          </div>
        </DropdownMenuLabel>

        <ScrollArea className="h-[350px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <BellIcon className="mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm">Ingen varsler</p>
            </div>
          ) : (
            notifications.map((item) => (
              <DropdownMenuItem
                key={item.id}
                className="group flex cursor-pointer items-start gap-3 rounded-none border-b px-4 py-3"
                onClick={() => {
                  if (!item.is_read) markRead(item.id);
                  if (item.type === "periodisering_suggestion" && item.reference_id) {
                    router.push(`/dashboard/periodisering?highlight=${item.reference_id}`);
                  } else if (item.type === "periodisering_accepted" && item.reference_id) {
                    router.push(`/dashboard/periodisering?tab=godkjent`);
                  } else if (
                    item.reference_id &&
                    (item.type === "invoice_viewed" || item.type === "invoice_paid")
                  ) {
                    setTimelineInvoiceId(item.reference_id);
                  }
                }}
              >
                <div className="flex flex-1 flex-col gap-1">
                  <div className="truncate text-sm font-medium">
                    {item.title}
                  </div>
                  <div className="text-muted-foreground line-clamp-2 text-xs">
                    {item.message}
                  </div>
                  <div className="text-muted-foreground flex items-center gap-1 text-xs">
                    <ClockIcon className="size-3!" />
                    {timeAgo(item.created_at)}
                  </div>
                </div>
                {!item.is_read && (
                  <div className="flex-0 mt-1">
                    <span className="bg-destructive/80 block size-2 rounded-full border" />
                  </div>
                )}
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>

    <InvoiceTimelineDialog
      invoiceId={timelineInvoiceId}
      open={!!timelineInvoiceId}
      onOpenChange={(open) => {
        if (!open) setTimelineInvoiceId(null);
      }}
    />
    </>
  );
};

export default Notifications;
