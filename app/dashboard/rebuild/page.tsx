import { WorkspacePageHeader } from "@/components/dashboard/workspace-page-header";

/**
 * The rebuild's placeholder page. Renders inside the dashboard shell (sidebar +
 * header + auth from the dashboard layout) like every other workspace page. The
 * eve agent is built and tested frontend-free for now (`npx eve dev` TUI); the
 * chat UI lands here later.
 */
export default function RebuildPage() {
  return <WorkspacePageHeader title="New Agent" />;
}
