"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMemberRole } from "@/lib/actions/team";
import type { Role } from "@/lib/types";

const BASE_OPTIONS: { value: Role; label: string }[] = [
  { value: "intern",   label: "Intern" },
  { value: "employee", label: "Employee" },
  { value: "manager",  label: "Manager" },
];

export function RoleSelect({
  id,
  role,
  canAssignCeo,
}: {
  id: string;
  role: Role;
  canAssignCeo: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [current, setCurrent] = useState<Role>(role);
  const [error, setError] = useState<string | null>(null);

  const options = canAssignCeo
    ? [...BASE_OPTIONS, { value: "ceo" as Role, label: "CEO" }]
    : BASE_OPTIONS;

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        className="select w-auto py-1 text-xs"
        value={current}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as Role;
          const previous = current;
          setCurrent(next);
          setError(null);
          start(async () => {
            const res = await updateMemberRole(id, next);
            if (res?.error) {
              setError(res.error);
              setCurrent(previous);
              return;
            }
            router.refresh();
          });
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <span className="text-[10px] text-red-300 max-w-[180px] text-right">{error}</span>}
    </div>
  );
}
