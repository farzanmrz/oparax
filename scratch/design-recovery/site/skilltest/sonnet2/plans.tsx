import { Check, Clock, Infinity as Inf } from "lucide-react";
import { Logo, XMark } from "./ui";
import { SectionHead } from "./sources";
import { agent, hostOf, mai, olmo, newest } from "./data";

const plans = [
  { name: "Hobby", price: 5, pool: 100, cadence: "A daily alert", ticks: 1, hue: "cyan" },
  { name: "Creator", price: 30, pool: 3000, cadence: "A daily alert", ticks: 1, hue: "green", lifted: true },
  { name: "Wire", price: 99, pool: 4000, cadence: "A mini digest every 15 minutes, or nothing if there is no news", ticks: 96, hue: "violet" },
];

export function Plans() {
  return (
    <section className="s2-sec" id="plans">
      <div className="s2-wrap">
        <SectionHead n="Pricing" tone="amber" title="Pay for the X posts you watch, not for sources">
          <span className="s2-chip h-ghost">Sites and feeds are unlimited on every plan</span>
        </SectionHead>

        <div className="s2-free s2-lift-sm">
          <span className="s2-chip h-green"><i className="s2-dot" /> Free week</span>
          <b>7 days, 300 watched X posts, no card</b>
          <span className="s2-segs s2-segs-w">{Array.from({ length: 7 }, (_, i) => <i key={i} />)}</span>
          <span className="s2-dim">Starts when your page is ready. At the end, stories stay readable.</span>
          <a className="s2-btn s2-btn-primary s2-btn-sm" href="#close">Start free</a>
        </div>

        <div className="s2-plans">
          {plans.map((p) => (
            <div key={p.name} className={`s2-card s2-plan ${p.lifted ? "s2-lift" : "s2-lift-sm"}`}>
              {p.lifted ? <div className="s2-glow-in" /> : null}
              <div className="s2-plan-top">
                <span className={`s2-plan-name h-${p.hue}`}><i className="s2-dot" style={{ background: "currentColor" }} />{p.name}</span>
                <div className="s2-price"><b>${p.price}</b><span>a month</span></div>
              </div>
              <div className="s2-plan-body">
                <div className="s2-plan-row">
                  <XMark size={12} />
                  <span>Watched X posts</span>
                  <b>{p.pool.toLocaleString("en-US")}</b>
                </div>
                <span className="s2-meter s2-meter-lg"><i className={`h-${p.hue}`} style={{ width: `${Math.max((p.pool / 4000) * 100, 3)}%`, background: "var(--c)" }} /></span>
                <div className="s2-plan-row">
                  <Inf size={13} />
                  <span>Websites and RSS feeds</span>
                  <b>Unlimited</b>
                </div>
                <div className="s2-plan-row">
                  <Clock size={13} />
                  <span>{p.cadence}</span>
                </div>
                <div className="s2-day" aria-hidden="true">
                  {Array.from({ length: p.ticks }, (_, i) => (
                    <i key={i} className={`h-${p.hue}`} style={p.ticks === 1 ? { left: "34%" } : undefined} />
                  ))}
                  <small><span>00:00</span><span>12:00</span><span>24:00</span></small>
                </div>
                {p.name === "Wire" ? (
                  <ul className="s2-mini-digest">
                    {[olmo, mai, agent].map((s) => (
                      <li key={s.id}><Logo host={hostOf(s.items[0].url)} size={14} round /><span>{s.card.headline}</span></li>
                    ))}
                  </ul>
                ) : (
                  <div className="s2-bubble s2-bubble-s">
                    <small>Your daily alert</small>
                    <strong>{(p.name === "Hobby" ? mai : olmo).card.headline}</strong>
                    <p>{(p.name === "Hobby" ? mai : olmo).card.facts[0].text}</p>
                  </div>
                )}
                <ul className="s2-ticks">
                  <li><Check size={12} /> One DM per story, ever</li>
                  <li><Check size={12} /> Every fact cites its source</li>
                </ul>
                <a className={`s2-btn ${p.lifted ? "s2-btn-primary" : "s2-btn-ghost"} s2-btn-full`} href="#close">Start free week</a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

void newest;
