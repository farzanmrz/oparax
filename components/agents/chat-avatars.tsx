import Image from "next/image";

/**
 * User avatar: shows the real profile image (avatarUrl) when available,
 * otherwise falls back to initials on a gradient circle that matches
 * the sidebar ws-avatar gradient.
 */
export function UserAvatar({
  name,
  avatarUrl,
  size = 36,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "·";

  const baseStyle: React.CSSProperties = {
    flexShrink: 0,
    width: size,
    height: size,
    borderRadius: "50%",
    overflow: "hidden",
    boxShadow: "inset 0 0 0 1px oklch(1 0 0 / 0.22)",
  };

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        style={{
          ...baseStyle,
          objectFit: "cover",
          display: "block",
        }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{
        ...baseStyle,
        background:
          "radial-gradient(circle at 30% 22%, #8fccff 0%, transparent 56%), conic-gradient(from 205deg at 50% 50%, #3b6fd4, #7a5be0, #2bbfa6, #3b6fd4)",
        color: "oklch(1 0 0)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        font: "600 0.75rem/1 var(--font-sans)",
        textShadow: "0 1px 2px oklch(0 0 0 / 0.4)",
      }}
    >
      {initials}
    </span>
  );
}
