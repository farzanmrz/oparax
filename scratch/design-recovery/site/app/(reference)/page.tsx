import { redirect } from "next/navigation";

// The site's root is the design walk: the flow starts at the login (owner, Oct 4: walk the whole flow on oparax.ai).
export default function Page() {
  redirect("/v2/one/login");
}
