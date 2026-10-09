import { redirect } from "next/navigation";

// Sources are managed on the Settings page.
export default function Page() {
  redirect("/v2/one/settings");
}
