import { notFound } from "next/navigation";
import { CardsGallery } from "@/v2/design/cards";
import { SidebarGallery } from "@/v2/design/sidebar";
import { SettingsGallery } from "@/v2/design/settings";
import { AppGallery } from "@/v2/design/app";

// Review-only: /v2/design/cards, /v2/design/sidebar, /v2/design/settings, /v2/design/app.
const pages = { cards: CardsGallery, sidebar: SidebarGallery, settings: SettingsGallery, app: AppGallery } as const;

export function generateStaticParams() {
  return Object.keys(pages).map((name) => ({ name }));
}

export default async function Page({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const Gallery = pages[name as keyof typeof pages];
  if (!Gallery) notFound();
  return <Gallery />;
}
