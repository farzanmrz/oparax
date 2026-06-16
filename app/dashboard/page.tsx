import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: connection } = await supabase.from("x_connections").select("id").maybeSingle<{
    id: string;
  }>();

  redirect(connection ? "/dashboard/agents" : "/dashboard/connect-x");
}
