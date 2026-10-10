import { OneSettings } from "@/v2/one/settings";

export const metadata = { title: "Oparax | One: Settings" };

// The page reads ?dir= (the council's two directions) on the client, so it renders on request, like the feed.
export const dynamic = "force-dynamic";

export default function Page() {
  return <OneSettings />;
}
