import { redirect } from "next/navigation";
import Preview from "../../components/preview";
import { typographyChoice } from "../../content/typography";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ set?: string; d?: string; view?: string; mode?: string; type?: string }>;
}) {
  const query = await searchParams;
  if (query.set === "pro") {
    const next = new URLSearchParams();
    for (const key of ["d", "view", "mode"] as const) if (query[key]) next.set(key, query[key]);
    redirect(`/pro${next.size ? `?${next}` : ""}`);
  }
  return (
    <Preview
      initial={Math.max(1, Math.min(4, Number(query.d) || 1))}
      initialPage={query.view === "feed" ? "feed" : "landing"}
      initialMode={query.mode === "direct" ? "direct" : "clustered"}
      initialTypography={typographyChoice(query.type)}
    />
  );
}
