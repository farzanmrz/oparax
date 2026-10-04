import { Nav } from "./atoms";
import { Hero } from "./hero";
import { Sources } from "./sources";
import { Stories } from "./stories";
import { Alerts } from "./alerts";
import { Start } from "./start";

// The Oparax landing page (skill test opus2). Five screens, each a different body in the same skin:
// a live desk, a source table, an evidence join, a two-day timeline with plans, and the real way in.
export function Landing() {
  return (
    <div className="ox2 min-h-svh">
      <Nav />
      <main>
        <Hero />
        <Sources />
        <Stories />
        <Alerts />
        <Start />
      </main>
    </div>
  );
}
