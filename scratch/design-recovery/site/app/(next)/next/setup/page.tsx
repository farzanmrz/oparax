import { Page, readParams, type SearchParams } from "@/next/frame";
import { SetupForm } from "@/next/setup-form";
import { setup } from "@/next/copy";

export default async function SetupPage({ searchParams }: { searchParams: SearchParams }) {
  const param = await readParams(searchParams);
  const error = param("error");
  return (
    <Page header="member">
      <div className="mx-auto w-full max-w-xl px-4 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">{setup.title}</h1>
        <div className="mt-8 rounded-xl border border-border bg-card p-7 shadow-[0_1px_2px_rgb(9_15_29/0.06),0_8px_24px_-12px_rgb(9_15_29/0.18)]">
          <SetupForm
            typed={param("handle") === "typed"}
            error={error === "handle_not_found" || error === "profile_not_found"}
            waitlist={param("state") === "waitlist"}
            blank={error === "blank"}
          />
        </div>
      </div>
    </Page>
  );
}
