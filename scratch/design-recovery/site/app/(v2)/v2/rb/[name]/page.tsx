import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import AppSidebar1 from "@/reactbits-pro-src/app-sidebar-1";
import AppSidebar2 from "@/reactbits-pro-src/app-sidebar-2";
import AppSidebar3 from "@/reactbits-pro-src/app-sidebar-3";
import AppSidebar4 from "@/reactbits-pro-src/app-sidebar-4";
import AppSidebar5 from "@/reactbits-pro-src/app-sidebar-5";
import AppSidebar6 from "@/reactbits-pro-src/app-sidebar-6";
import AppSidebar7 from "@/reactbits-pro-src/app-sidebar-7";
import AppShell1 from "@/reactbits-pro-src/app-shell-1";
import Wizard6 from "@/reactbits-pro-src/wizard-6";
import Onboarding2 from "@/reactbits-pro-src/onboarding-2";
import Onboarding6 from "@/reactbits-pro-src/onboarding-6";
import SettingsForm1 from "@/reactbits-pro-src/settings-form-1";
import SettingsForm3 from "@/reactbits-pro-src/settings-form-3";
import List1 from "@/reactbits-pro-src/list-1";
import List12 from "@/reactbits-pro-src/list-12";

// Review-only: one React Bits Pro App UI block per address, as shipped, inside the height-bounded parent its docs
// require. /v2/rb/app-sidebar-1 and so on.
const blocks: Record<string, ComponentType> = {
  "app-sidebar-1": AppSidebar1,
  "app-sidebar-2": AppSidebar2,
  "app-sidebar-3": AppSidebar3,
  "app-sidebar-4": AppSidebar4,
  "app-sidebar-5": AppSidebar5,
  "app-sidebar-6": AppSidebar6,
  "app-sidebar-7": AppSidebar7,
  "app-shell-1": AppShell1,
  "wizard-6": Wizard6,
  "onboarding-2": Onboarding2,
  "onboarding-6": Onboarding6,
  "settings-form-1": SettingsForm1,
  "settings-form-3": SettingsForm3,
  "list-1": List1,
  "list-12": List12,
};

export function generateStaticParams() {
  return Object.keys(blocks).map((name) => ({ name }));
}

export default async function Page({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const Block = blocks[name];
  if (!Block) notFound();
  return (
    <div className="dark h-svh w-full bg-neutral-950 text-neutral-50">
      <Block />
    </div>
  );
}
