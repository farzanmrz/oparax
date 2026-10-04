import { Nav, Hero } from "@/skilltest/sonnet2/hero";
import { Sources } from "@/skilltest/sonnet2/sources";
import { Judge } from "@/skilltest/sonnet2/judge";
import { Alerts } from "@/skilltest/sonnet2/alerts";
import { FeedPage } from "@/skilltest/sonnet2/feed";
import { Plans } from "@/skilltest/sonnet2/plans";
import { Close } from "@/skilltest/sonnet2/close";

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Sources />
        <Judge />
        <Alerts />
        <FeedPage />
        <Plans />
        <Close />
      </main>
    </>
  );
}
