import { ClientsTable } from "@/components/admin/ClientsTable";

/** The client registry: search, sort, create, invite. */
export default function ClientsPage() {
  return <ClientsTable />;
}

export const dynamic = "force-dynamic";
