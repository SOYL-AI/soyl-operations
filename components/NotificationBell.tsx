"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function NotificationBell({
  userId,
  initialUnread,
}: {
  userId: string;
  initialUnread: number;
}) {
  const router = useRouter();
  const [unread, setUnread] = useState(initialUnread);

  useEffect(() => {
    setUnread(initialUnread);
  }, [initialUnread]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notif:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          setUnread((u) => u + 1);
          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          router.refresh();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return (
    <Link
      href="/activity#notifications"
      className="relative btn btn-ghost border-white/10 px-2.5 py-2"
      aria-label="notifications"
    >
      <Bell className="h-4 w-4" />
      {unread ? (
        <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-mint px-1 text-[10px] font-bold text-ink-900">
          {unread}
        </span>
      ) : null}
    </Link>
  );
}
