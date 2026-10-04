import { BellRing, Check, ExternalLink, MailX, Pause, Play, Square } from "lucide-react";
import { Avatar, Logo, OparaxMark, ReportChip, Thumb, XMark } from "./ui";
import { SectionHead } from "./sources";
import { HANDLE, sol, recentItems, when, hostOf } from "./data";

export function Alerts() {
  const first = recentItems.simonSol;
  const later = recentItems.latentSol;
  return (
    <section className="s2-sec" id="alerts">
      <div className="s2-wrap">
        <SectionHead n="Alert" tone="blue" title="One DM per story, ever">
          <span className="s2-chip h-ghost">Later reports improve the card, never DM again</span>
        </SectionHead>

        <div className="s2-grid-alerts">
          <div className="s2-card s2-lift s2-thread">
            <div className="s2-glow-in s2-glow-in-blue" />
            <div className="s2-card-h">
              <span className="s2-bot"><OparaxMark size={14} /></span>
              <b>Oparax</b><small className="s2-dim">@oparax_ai</small>
              <span className="s2-chip h-green" style={{ marginLeft: "auto" }}><i className="s2-dot" /> Alerts on</span>
            </div>
            <div className="s2-thread-b">
              <div className="s2-msg s2-me"><span>Start alerts</span><small>from @{HANDLE}</small></div>
              <div className="s2-msg">
                <span className="s2-bot s2-bot-sm"><OparaxMark size={11} /></span>
                <div className="s2-bubble">
                  <small>Alerts started</small>
                  <p>You will get one DM for each new story on your beat.</p>
                </div>
              </div>
              <time className="s2-center">{when(first.published_at)} UTC</time>
              <div className="s2-msg">
                <span className="s2-bot s2-bot-sm"><OparaxMark size={11} /></span>
                <div className="s2-bubble s2-bubble-w">
                  <small>New story for your beat</small>
                  <strong>{sol.card.headline}</strong>
                  <p>{sol.card.facts[0].text}</p>
                  <div className="s2-linkcard">
                    <Thumb src={sol.card.image} />
                    <div>
                      <span>oparax.ai/{HANDLE}/{sol.id}</span>
                      <b>Open the story</b>
                    </div>
                    <ExternalLink size={13} />
                  </div>
                </div>
              </div>
            </div>
            <div className="s2-composer">
              <span>Message</span>
              <i className="s2-sq"><XMark size={12} /></i>
            </div>
          </div>

          <div className="s2-card s2-lift-sm s2-tl-card">
            <div className="s2-card-h"><b>What happens to one story</b><ReportChip kind="article" n={2} /></div>
            <ol className="s2-tl">
              <li className="s2-tl-a">
                <span className="s2-tl-dot"><BellRing size={12} /></span>
                <div>
                  <span className="s2-tl-t"><Logo host={hostOf(first.url)} size={16} round /><b>Simon Willison</b><time>{when(first.published_at)}</time></span>
                  <p>The first report opens the story and sends your DM.</p>
                  <span className="s2-chip h-blue"><XMark size={10} /> DM sent</span>
                </div>
              </li>
              <li className="s2-tl-b">
                <span className="s2-tl-dot"><Check size={12} /></span>
                <div>
                  <span className="s2-tl-t"><Logo host={hostOf(later.url)} size={16} round /><b>Latent Space</b><time>{when(later.published_at)}</time></span>
                  <p>A second report joins the same card and adds its own facts.</p>
                  <span className="s2-chip h-green"><MailX size={10} /> No new DM</span>
                </div>
              </li>
            </ol>
            <div className="s2-card-f s2-card-f-col">
              <span className="s2-dim">The card on your page, after both reports</span>
              <div className="s2-mini-story">
                <div className="s2-story-top"><Logo host="simonwillison.net" size={15} round /><Logo host="latent.space" size={15} round /><span className="s2-pubs">Latent Space, Simon Willison</span></div>
                <h4>{sol.card.headline}</h4>
              </div>
            </div>
          </div>

          <div className="s2-col-r">
            <div className="s2-card s2-lift-sm">
              <div className="s2-card-h"><b>You stay in control</b></div>
              <div className="s2-pad s2-cmds">
                <div className="s2-cmd h-red"><Square size={11} /> <b>STOP</b><span>Ends alerts</span></div>
                <div className="s2-cmd h-amber"><Pause size={11} /> <b>PAUSE</b><span>Holds them</span></div>
                <div className="s2-cmd h-green"><Play size={11} /> <b>RESUME</b><span>Brings them back</span></div>
              </div>
            </div>
            <div className="s2-card s2-lift-sm">
              <div className="s2-card-h"><b>Delivery</b><span className="s2-live"><i className="s2-dot" /> Live</span></div>
              <div className="s2-pad s2-kv">
                <div><small>To</small><span><Avatar handle="@farzanmrz" size={16} /> @{HANDLE}</span></div>
                <div><small>From</small><span><span className="s2-bot s2-bot-xs"><OparaxMark size={9} /></span> @oparax_ai</span></div>
                <div><small>Link</small><span className="s2-mono">oparax.ai/{HANDLE}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
