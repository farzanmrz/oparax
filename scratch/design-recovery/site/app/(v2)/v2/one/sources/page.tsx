import { OneSources } from "@/v2/one/settings";

export const metadata = { title: "Oparax | One: Sources" };

// The page reads ?dir= on the client through the shell, so it renders on request.
export const dynamic = "force-dynamic";

export default function Page() {
  return <OneSources />;
}
