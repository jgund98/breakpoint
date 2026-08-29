import { StaffPanel } from "@/components/admin/StaffPanel";

/** Internal staff access: who can open this console. */
export default function TeamPage() {
  return <StaffPanel />;
}

export const dynamic = "force-dynamic";
