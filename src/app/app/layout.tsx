import type { Metadata } from "next";
import { AppShell } from "@/components/app/AppShell";
import { BootScreen } from "@/components/app/BootScreen";
import { WorkspaceProvider } from "@/components/app/WorkspaceProvider";

export const metadata: Metadata = {
  title: "Workspace",
  robots: { index: false, follow: false },
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceProvider>
      <BootScreen />
      <AppShell>{children}</AppShell>
    </WorkspaceProvider>
  );
}
