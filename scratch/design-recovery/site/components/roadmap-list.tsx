import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sharedCopy } from "../content/free-preview-copy";
import { Brand } from "./brand";

export function RoadmapList() {
  const text = sharedCopy.roadmap;
  return (
    <section className="roadmap-list-section page-width" id="roadmap">
      <div className="section-intro">
        <h2>{text.heading}</h2>
        <p>{text.intro}</p>
      </div>
      <div className="roadmap-journey">
        <Card className="roadmap-inputs">
          <CardHeader>
            <div className="roadmap-card-heading">
              <CardTitle>
                <h3 id="roadmap-sources">{text.sources}</h3>
              </CardTitle>
              <Badge variant="outline">{text.planned}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="roadmap-platforms" aria-labelledby="roadmap-sources">
              {text.sourcesList.map(([id, label]) => (
                <li key={id}>
                  <Brand name={id} />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="roadmap-outputs">
          <CardHeader>
            <CardTitle>
              <h3 id="roadmap-delivery">{text.destinations}</h3>
            </CardTitle>
            <CardDescription>{text.note}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul aria-labelledby="roadmap-delivery">
              {text.destinationsList.map(([id, label]) => (
                <li key={id}>
                  <Brand name={id} />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
