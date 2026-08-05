import type { Metadata } from "next";
import { SettingsBoard } from "@/components/app/SettingsBoard";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return <SettingsBoard />;
}
