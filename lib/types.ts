export type Role = "super_admin" | "ceo" | "manager" | "employee" | "intern";

export type TaskStatus = "todo" | "in_progress" | "review" | "done" | "blocked";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "cancelled";
export type TxType = "revenue" | "expense";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  avatar_url: string | null;
  title: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  client_name: string | null;
  owner_id: string | null;
  budget: number | null;
  start_date: string | null;
  due_date: string | null;
  progress: number;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  project_id: string | null;
  assignee_id: string | null;
  created_by: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  type: TxType;
  category: string | null;
  amount: number;
  currency: string;
  project_id: string | null;
  description: string | null;
  occurred_on: string;
  created_by: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  reviewee_id: string;
  reviewer_id: string;
  rating: number;
  feedback: string | null;
  period: string;
  created_at: string;
}

export interface ActivityEntry {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  body: string;
  created_at: string;
}
