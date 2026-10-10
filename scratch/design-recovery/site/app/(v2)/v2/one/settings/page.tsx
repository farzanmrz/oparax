import { redirect } from "next/navigation";

// There is no Settings page (owner, Oct 10): Sources, Notifications and Account are the pages.
export default function Page() {
  redirect("/v2/one/sources");
}
