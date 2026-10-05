import { redirect } from "next/navigation";

// Sources and notifications live on the Settings page.
export default function Page() {
  redirect("/v2/one/settings");
}
