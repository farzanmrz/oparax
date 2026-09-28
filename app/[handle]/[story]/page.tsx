import MonitorPage from "@/app/[handle]/page";

export { generateMetadata } from "@/app/[handle]/page";

export default function StoryPage(props: {
  params: Promise<{ handle: string; story: string }>;
  searchParams: Promise<{
    before?: string | string[];
    beforeId?: string | string[];
    view?: string | string[];
    error?: string | string[];
  }>;
}) {
  return <MonitorPage {...props} />;
}
