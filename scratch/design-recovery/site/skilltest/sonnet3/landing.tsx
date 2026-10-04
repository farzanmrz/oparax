import { Hero } from "./hero";
import { ThemeGuard } from "./theme-guard";
import { Sources } from "./sources";
import { Stories } from "./stories";
import { Alerts } from "./alerts";
import { Plans } from "./plans";

export function Landing() {
  return (
    <div className="palette-council s3">
      <ThemeGuard />
      <Hero />
      <Sources />
      <Stories />
      <Alerts />
      <Plans />
    </div>
  );
}
