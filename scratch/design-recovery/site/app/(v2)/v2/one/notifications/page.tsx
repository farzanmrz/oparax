import { OneNotifications, type DmState } from "@/v2/one/notifications";

export const metadata = { title: "Oparax | One: Notifications" };

const STATES: DmState[] = ["connected", "waiting", "paused", "stopped"];

// Twitter DMs, the alert hour and the digests. ?dm=connected|waiting|paused|stopped picks the sample DM state.
export default async function Page({ searchParams }: { searchParams: Promise<{ dm?: string }> }) {
  const { dm } = await searchParams;
  return <OneNotifications dm={STATES.find((s) => s === dm) ?? "waiting"} />;
}
