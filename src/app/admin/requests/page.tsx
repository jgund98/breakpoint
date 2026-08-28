import { RequestsQueue } from "@/components/admin/RequestsQueue";

/** The cross-client request queue. */
export default function RequestsPage() {
  return <RequestsQueue />;
}

export const dynamic = "force-dynamic";
