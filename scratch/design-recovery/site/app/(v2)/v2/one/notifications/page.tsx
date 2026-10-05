import { OneSettings } from "@/v2/one/settings";

export const metadata = { title: "Oparax | One: Notifications" };

// Notifications is a row in Settings: this route opens the Settings page with that row lit once.
export default function Page() {
  return <OneSettings highlight="notifications" />;
}
