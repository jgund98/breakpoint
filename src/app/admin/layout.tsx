import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/Shell";

/** Every admin page renders inside the console shell. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}

export const metadata = { title: "Operations" };
