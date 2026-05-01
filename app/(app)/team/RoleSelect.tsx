"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMemberRole } from "@/lib/actions/team";
import type { Role } from "@/lib/types";

export function RoleSelect({ id, role }: { id: string; role: Role }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select
      className="select w-auto py-1 text-xs"
      value={role}
      disabled={pending}
      onChange={(e) =>
        start(async () => {
          await updateMemberRole(id, e.target.value as Role);
          router.refresh();
        })
      }
    >
      <option value="intern">Intern</option>
      <option value="employee">Employee</option>
      <option value="manager">Manager</option>
      <option value="ceo">CEO</option>
    </select>
  );
}
