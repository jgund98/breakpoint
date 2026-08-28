"use client";

import { Printer } from "lucide-react";
import { ActionButton } from "./ui";

export function PrintButton() {
  return (
    <ActionButton variant="secondary" onClick={() => window.print()}>
      <Printer className="h-4 w-4" /> Print or save as PDF
    </ActionButton>
  );
}
