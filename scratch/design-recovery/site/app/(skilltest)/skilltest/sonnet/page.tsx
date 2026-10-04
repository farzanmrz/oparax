import { Hero } from "@/skilltest/sonnet/hero";
import { Sources } from "@/skilltest/sonnet/sources";
import { Alerts, Closer, Footer, Nav, Pricing, Stories } from "@/skilltest/sonnet/sections";

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Sources />
        <Stories />
        <Alerts />
        <Pricing />
        <Closer />
      </main>
      <Footer />
    </>
  );
}
