// Route-level loading UI for the dashboard. Renders instantly (Server Component,
// no client hooks, no data) while the real page resolves auth + DB, so navigation
// paints a shell-shaped skeleton instead of blocking on a blank frame. Reuses the
// workspace classes (.ws-head / .ws-divider / .ws-list / .ws-agent-card) from
// app/workspace.css so the layout matches what loads in. The shimmer is inline so
// this stays dependency-free.
export default function DashboardLoading() {
  return (
    <>
      <style>{`
        @keyframes ws-skel-pulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 0.25; } }
        .ws-skel {
          background: var(--line);
          border-radius: 6px;
          animation: ws-skel-pulse 1.2s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .ws-skel { animation: none; opacity: 0.4; }
        }
      `}</style>

      <div className="ws-head">
        <div
          className="ws-skel"
          style={{
            width: 160,
            height: 32,
            borderRadius: 8,
          }}
        />
        <div
          className="ws-skel"
          style={{
            marginLeft: "auto",
            width: 124,
            height: 36,
            borderRadius: 8,
          }}
        />
      </div>
      <div className="ws-divider" />

      <div className="ws-list" aria-hidden="true">
        {[0, 1, 2].map((row) => (
          <div key={row} className="ws-agent-card">
            <div className="ws-agent-main">
              <div
                className="ws-skel"
                style={{
                  width: 180,
                  height: 18,
                }}
              />
              <div className="ws-agent-handles">
                <div
                  className="ws-skel"
                  style={{
                    width: 84,
                    height: 22,
                    borderRadius: 4,
                  }}
                />
                <div
                  className="ws-skel"
                  style={{
                    width: 96,
                    height: 22,
                    borderRadius: 4,
                  }}
                />
                <div
                  className="ws-skel"
                  style={{
                    width: 72,
                    height: 22,
                    borderRadius: 4,
                  }}
                />
              </div>
            </div>
            <div
              className="ws-skel"
              style={{
                width: 76,
                height: 16,
              }}
            />
          </div>
        ))}
      </div>

      <span
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        Loading…
      </span>
    </>
  );
}
