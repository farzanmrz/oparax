import ProPreview from "../../../pro/preview";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ d?: string; view?: string; mode?: string; theme?: string }>;
}) {
  const query = await searchParams;
  return (
    <ProPreview
      initialDirection={Math.max(1, Math.min(4, Number(query.d) || 1))}
      initialPage={query.view === "feed" ? "feed" : "landing"}
      initialMode={query.mode === "direct" ? "direct" : "clustered"}
      initialDark={query.theme !== "light"}
    />
  );
}
