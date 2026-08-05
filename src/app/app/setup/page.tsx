import type { Metadata } from "next";
import { SetupBoard } from "@/components/app/SetupBoard";

export const metadata: Metadata = { title: "Portfolio setup" };

export default function SetupPage() {
  return <SetupBoard />;
}
