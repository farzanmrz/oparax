// Shared page header for workspace pages — the title row + thin divider that the
// connect-x landing established (.ws-head / .ws-divider in app/workspace.css).
// `action` is an optional right-aligned node (e.g. a "New agent" button/link),
// pushed right by the `.ws-head .btn { margin-left: auto }` rule. Server-safe.
export function WorkspacePageHeader({
  title,
  action,
}: {
  title: string
  action?: React.ReactNode
}) {
  return (
    <>
      <div className="ws-head">
        <h1>{title}</h1>
        {action}
      </div>
      <div className="ws-divider" />
    </>
  )
}
