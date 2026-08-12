"use client";

import { useCallback, useRef, useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * TAKE THE FILE THEY ACTUALLY HAVE
 *
 * The intake was paste-only, which works for twenty rows and fails for
 * eight hundred: a lease administration export arrives as a workbook,
 * and nobody opens one to copy a thousand lines into a text box.
 *
 * So this takes the file. Drag it, pick it, or keep pasting. Sheets are
 * read in the browser and only the parsed rows go anywhere, which is
 * also the honest version of the promise made on this screen.
 *
 * Workbooks with several sheets report which ones they found and read
 * the first with data in it, because "Sheet1" is empty more often than
 * anyone admits and silently returning nothing looks like a broken
 * upload rather than a wrong tab.
 */

export type LoadedFile = {
  name: string;
  /** Delimited text, whatever the file arrived as. */
  text: string;
  sheet?: string;
  otherSheets?: string[];
  rowCount: number;
};

const SHEET_EXT = /\.(xlsx|xlsm|xlsb|xls|ods)$/i;
const TEXT_EXT = /\.(csv|tsv|txt|tab)$/i;

export function FileDrop({
  onLoad,
  onError,
  className,
}: {
  onLoad: (f: LoadedFile) => void;
  onError: (message: string) => void;
  className?: string;
}) {
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const handle = useCallback(
    async (file: File) => {
      setBusy(true);
      try {
        if (SHEET_EXT.test(file.name)) {
          /* Loaded on demand so a client who only ever pastes CSV never
             downloads the workbook parser. */
          const XLSX = await import("xlsx");
          const buf = await file.arrayBuffer();
          const wb = XLSX.read(buf, { type: "array" });

          const named = wb.SheetNames;
          let chosen = "";
          let csv = "";
          for (const name of named) {
            const out = XLSX.utils.sheet_to_csv(wb.Sheets[name]);
            /* A header row alone is not data. */
            if (out.trim().split(/\r?\n/).length > 1) {
              chosen = name;
              csv = out;
              break;
            }
          }
          if (!csv) {
            onError(
              `${file.name} opened, but every sheet in it is empty. Sheets found: ${named.join(", ")}.`,
            );
            return;
          }
          onLoad({
            name: file.name,
            text: csv,
            sheet: chosen,
            otherSheets: named.filter((n) => n !== chosen),
            rowCount: Math.max(0, csv.trim().split(/\r?\n/).length - 1),
          });
          return;
        }

        if (TEXT_EXT.test(file.name) || file.type.startsWith("text/")) {
          const text = await file.text();
          if (!text.trim()) {
            onError(`${file.name} is empty.`);
            return;
          }
          onLoad({
            name: file.name,
            text,
            rowCount: Math.max(0, text.trim().split(/\r?\n/).length - 1),
          });
          return;
        }

        onError(
          `We cannot read ${file.name}. Send a spreadsheet (.xlsx, .xls, .ods) or a delimited file (.csv, .tsv).`,
        );
      } catch (e) {
        onError(
          `${file.name} could not be read. ${e instanceof Error ? e.message : "Unknown error."}`,
        );
      } finally {
        setBusy(false);
      }
    },
    [onLoad, onError],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) void handle(f);
      }}
      className={cn(
        "rounded-xl border-2 border-dashed p-6 text-center transition-colors duration-200",
        over
          ? "border-petrol-500 bg-petrol-50"
          : "border-line bg-surface-sunk hover:border-petrol-300",
        className,
      )}
    >
      <input
        ref={input}
        type="file"
        accept=".csv,.tsv,.txt,.xlsx,.xlsm,.xlsb,.xls,.ods"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handle(f);
          e.target.value = "";
        }}
      />

      <div className="flex flex-col items-center gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface text-petrol-700 ring-1 ring-line">
          {busy ? (
            <FileSpreadsheet className="h-4 w-4 animate-pulse" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </span>
        <p className="text-[0.875rem] font-medium text-ink">
          {busy ? "Reading the file" : "Drop your export here"}
        </p>
        <p className="max-w-sm text-[0.75rem] leading-relaxed text-muted">
          Excel, CSV or TSV. Straight out of Yardi, MRI, Tango, Visual Lease or
          a spreadsheet. It is read in your browser and nothing is uploaded at
          this step.
        </p>
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="mt-1 rounded-lg border border-line bg-surface px-4 py-2 text-[0.8125rem] font-semibold text-ink transition-colors duration-250 hover:border-petrol-300 hover:bg-petrol-50"
        >
          Choose a file
        </button>
      </div>
    </div>
  );
}
