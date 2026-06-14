/**
 * Placeholder section for not-yet-shipped settings areas. Renders a titled panel
 * with a "Coming soon" badge and shows its children as a disabled, non-
 * interactive preview so the eventual layout is visible without being usable.
 * @param props.title - section title
 * @param props.description - section description
 * @param props.children - preview content rendered inert
 * @returns the coming-soon section
 */
export function ComingSoonSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="ws-panel">
      <div className="ws-panel-head">
        <div className="ws-panel-title">
          <span>{title}</span>
          <span className="ws-soon-badge">Coming soon</span>
        </div>
        <p className="ws-panel-desc">{description}</p>
      </div>
      <div className="ws-panel-body">
        <div className="ws-inert" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  )
}
