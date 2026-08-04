# Issue 99 filtration experiments

This is the human-readable experiment ledger for the isolated voice-extractor lab. Structured JSONL and snapshot files under `lab/voice-extractor/filtration-eval/` exist only when the runner consumes them. Add future results here rather than creating another result-summary JSON.

## Current decision

The frozen downstream control is the no-extractor pipeline at **1,252/1,336 correct (93.71%)**. Extractor treatments now use the newest 50 original posts with their media and deterministically resolved X-post links, without web search. From that fixed input, each treatment may change only `extractor-prompt.md` and the filtration guidance it produces; the downstream prompt, evidence, model, parameters, and benchmark stay fixed.

The 93.71% score is a control, not evidence that the extractor is unnecessary. It establishes how well the downstream model performs with only the reporter's raw beat and source evidence. Extractor guidance is useful only when it improves this result without creating more regressions than fixes.

## Benchmark

- Reporter: `@ReshadRahman`
- Beat: `I want to monitor all news around FC Barcelona.`
- Rows: 1,336 X posts from the 15 sources represented in the unanimous benchmark.
- Golden label: unanimous agreement between the Luna labeling lane, Claude Opus review, and Codex Sol review.
- Output measured: binary `on_beat` plus reasoning; accuracy uses only the binary verdict.

## Frozen no-extractor pipeline

1. English posts pass through unchanged. Posts tagged with another language receive a separate faithful English translation first.
2. The original post text and URLs are preserved.
3. Production-feasible linked content already retrieved from those URLs is included.
4. The source account's handle and profile are included as context, with an instruction that the profile alone does not make a post on-beat.
5. Original images and available video poster frames are attached.
6. The raw beat is included in the user message.
7. Qwen 3.7 Flash runs at temperature `0`, medium reasoning, with no web search, and returns structured `{on_beat, reasoning}`.

The shared translation pass and all 1,336 filtration calls cost approximately **$0.1741** in the measured control run.

## Results

| Experiment | Correct | Accuracy | Paired effect versus current control | Decision |
| --- | ---: | ---: | --- | --- |
| Link enrichment without source profile | 1,243/1,336 | 93.04% | 9 fewer correct | Superseded |
| Add source profile to link-enriched input | 1,252/1,336 | 93.71% | Established current control | Keep |
| Nested XML input + minimally adapted XML prompt | 1,254/1,336 | 93.86% | 29 fixes, 27 regressions, net +2 | Promising; replicate before promotion |
| Faithful Markdown-only system prompt | 1,243/1,336 | 93.04% | 10 fixes, 19 regressions, net −9 | Reject |
| Markdown prompt + nested XML input | 1,248/1,336 | 93.41% | 25 fixes, 29 regressions, net −4 | Reject as control replacement |
| Extractor T1: decision-relevant delta boundaries | 1,252/1,336 | 93.71% | 13 fixes, 13 regressions, net 0 | Reject; restore extractor prompt |
| Extractor T2: newest 50 posts with media and resolved X links | 1,249/1,336 | 93.49% | 12 fixes, 15 regressions, net −3 | Reject guidance; keep 50-post corpus limit |
| High reasoning for translation and filtration | 1,247/1,336 | 93.34% | 14 fixes, 19 regressions, net −5 | Reject; keep medium |
| Perplexity grounding on the 624 gated rows | 1,241/1,336 | 92.89% | 29 fixes, 40 regressions, net −11 | Reject |
| Parallel grounding on the 624 gated rows | 1,239/1,336 | 92.74% | 28 fixes, 41 regressions, net −13 | Reject |
| Source-text-only Perplexity queries | 1,228/1,336 | 91.92% | 25 fixes, 49 regressions, net −24 | Reject |

## Markdown prompt and nested XML input treatment

This downstream-pipeline treatment changed the system prompt and user-message representation together while keeping the remaining control fixed: Qwen 3.7 Flash, temperature 0, medium reasoning, no extractor guidance, no web search, the raw user-written beat, shared conditional translations, the same source biographies, linked-content snapshot, source media, and 1,336-row benchmark.

The XML-tagged system prompt became Markdown with numbered task subheaders and plain-language filtration instructions. In the user message, `<beat_description>` became `<beat>`; the `<source>` wrapper, duplicate profile handle, and display name were removed; the author handle moved to the `<post>` attributes; the biography and post text became nested elements; linked-content metadata moved to attributes; and source or linked attachments were nested directly inside the item they belong to. Media type tags replaced attachment indexes, kinds, and representation attributes. The structured-output schema enforced by the SDK did not change.

The treatment scored **1,248/1,336 (93.41%)**, down four correct decisions and 0.30 percentage points from the **1,252/1,336 (93.71%)** control. It changed 54 paired verdicts: 25 fixes and 29 regressions. The direction was more conservative rather than uniformly worse. It fixed 18 off-beat and 7 on-beat rows, while regressing 11 off-beat and 18 on-beat rows. Consequently, false positives improved from 58 to 51, but false negatives worsened from 26 to 37; the complete matrix moved from 786 TP / 466 TN / 58 FP / 26 FN to 775 TP / 473 TN / 51 FP / 37 FN.

The Markdown prompt was longer than the frozen prompt (2,620 versus 1,712 characters), and total input tokens rose from 1,602,514 to 1,629,140. Output tokens fell from 375,716 to 280,630, reducing the measured filtration-call cost from about $0.09692 to $0.08536, but the lower cost does not compensate for worse accuracy in the current objective.

Reject this bundled treatment as the new control. Because it deliberately combined prompt format, task wording, output illustration, profile-field removal, and XML restructuring, this run cannot attribute the regression to Markdown or any individual schema choice. Any follow-up must isolate one of those changes against the frozen control.

Exact fixed post IDs: `1797221717787513308`, `1982258377272037386`, `1164124111439892480`, `1535660043797942275`, `1702380015818608989`, `1746636131989327992`, `1567566164393328641`, `1644110762644832256`, `1705854884375847248`, `1507554674257321993`, `1682561842638454784`, `1682597961824456704`, `1972904491688272126`, `1606691807148273664`, `1601329516617400320`, `1690516179117568000`, `1762392969783754803`, `1700109846874378413`, `1582654473784430593`, `1604966848771936256`, `1843334220632011171`, `1895781015362425188`, `1684019030934315009`, `1664042755293601792`, `1601599457723834371`.

Exact regressed post IDs: `534411640838823936`, `1534844533648801792`, `1259241342603067392`, `1420015686097768452`, `1711436105831374991`, `1806323165779394593`, `1812618239135859031`, `1705696229668040943`, `1911804526132154530`, `1912610335980142627`, `511458699882528768`, `1829908634240999472`, `1604566956199272449`, `1417283769720049667`, `1967962096865526016`, `1899954965222764716`, `1944791762272137631`, `1147996471205257218`, `1812617380373078217`, `1924227488453967993`, `1923313768387248399`, `1719110059857252862`, `1693847933651751066`, `1910630150699704724`, `1850977062015885771`, `1923802635003625602`, `1832860607122653241`, `1205895151228461057`, `1975260013208711203`.

## Decomposed system-prompt and user-input ablations

The combined Markdown/nested-XML result changed too many things to diagnose. Two parallel full-corpus runs separated its principal factors while retaining the same Qwen 3.7 Flash control, temperature 0, medium reasoning, raw beat, translations, source evidence, structured output enforcement, and benchmark.

### Nested XML user input

This arm used [`drafter-filter-nested-input-prompt.md`](../lab/voice-extractor/filtration-eval/drafter-filter-nested-input-prompt.md), which preserves the XML system prompt's identity, background, task, output contract, and nearly all wording. Only the input-context wording and media labels were minimally adapted to the new nested representation. The user message used `<beat>` plus a single `<post>` with the author handle as an attribute, biography and content as children, and attachments nested inside the source or linked item they belong to. The display name and redundant profile handle were omitted, as in the combined treatment.

It scored **1,254/1,336 (93.86%)**, two more correct and 0.15 percentage points above the frozen control. It changed 56 paired verdicts: 29 fixes and 27 regressions. Nineteen fixes and ten regressions were off-beat rows; ten fixes and seventeen regressions were on-beat rows. The net effect was again stricter filtration: false positives improved from 58 to 49, while false negatives worsened from 26 to 33. The complete matrix was 779 TP / 475 TN / 49 FP / 33 FN.

This is directionally promising but not strong evidence of a durable improvement: the two-row gain sits inside 56 changed verdicts, and an exact two-sided paired McNemar test gives p ≈ 0.894. Keep the frozen control until this result replicates or a narrower input-field ablation identifies a stable gain.

The more compact serialized input reduced total input tokens from 1,602,514 to 1,542,872. Output tokens fell from 375,716 to 299,208, and measured filtration-call cost fell from about $0.09692 to $0.08518.

### Faithful Markdown-only system prompt

This arm used [`drafter-filter-markdown-only-prompt.md`](../lab/voice-extractor/filtration-eval/drafter-filter-markdown-only-prompt.md). Every sentence and the pseudo-JSON output shape remained unchanged; only the system prompt's XML section tags became equivalent Markdown headers. The complete baseline user message—including `<beat_description>`, `<source>`, duplicate profile handle, display name, biography, linked-content references, and separately labeled attachments—remained unchanged.

It scored **1,243/1,336 (93.04%)**, nine fewer correct and 0.67 percentage points below the frozen control. It changed 29 paired verdicts: 10 fixes and 19 regressions. Five fixes and eight regressions were off-beat rows; five fixes and eleven regressions were on-beat rows. The confusion matrix moved to 780 TP / 463 TN / 61 FP / 32 FN. The exact two-sided paired McNemar p-value is approximately 0.136.

Reject the faithful Markdown-only conversion. In this measured setup, the XML system-prompt structure performed better even when its wording and user input were held fixed. The treatment used 1,591,230 input tokens, 363,929 output tokens, and about $0.09505 in filtration-call cost.

## High-reasoning ablation

Both translation and filtration were raised from medium to high while every prompt, input, and other parameter remained unchanged. Accuracy fell by 0.37 percentage points. The 458 non-English or undefined-language rows remained exactly 443/458 correct even though 223 translation strings changed; the entire net loss came from English rows. Combined cost increased about 1.68%. There is no measured reason to pay for high reasoning in this pipeline.

## Search experiments

A five-row diagnostic suggested grounding could help difficult media posts: optional and forced search each reached 4/5, while the same rows without search reached 1/5. The full corpus contradicted that small-sample impression.

The first full-corpus gate requested search for 624/1,336 rows (46.71%). It captured 52 of the control's 84 errors but also selected 572 already-correct rows. Media presence dominated the gate, and 471/624 proposed queries inserted Barcelona-related wording absent from the source post.

Executing those searches did not improve accuracy. Perplexity issued 856 search calls with $4.28 in search fees; Parallel issued 1,333 calls with $6.665 in fees. A source-text-only Perplexity follow-up issued 1,110 searches for $5.55 and performed worse. Provider-executed search could still insert Barcelona into 42 queries even when the dispatch model received no beat or profile. Web search is therefore excluded from the control.

## Extractor treatment 1: decision-relevant delta boundaries

The first extractor-only treatment added one instruction to concentrate on boundaries that add information beyond the raw beat, especially near-neighbor football stories, and not infer exclusions merely from absence in the 100-post corpus. It also prohibited voice or drafting advice and obvious restatement of the beat. Claude Sonnet 5 produced the versioned guidance artifact [`t1-delta-boundaries.md`](../lab/voice-extractor/filtration-eval/guidance/t1-delta-boundaries.md), which was injected into the otherwise unchanged downstream control.

The treatment tied the control at **1,252/1,336 (93.71%)**. Its aggregate confusion matrix was also identical (786 true positives, 466 true negatives, 58 false positives, 26 false negatives), but 26 individual verdicts changed: 13 fixes and 13 regressions. The guidance helped reject unrelated rival, third-party transfer, and former-player stories, but it traded those gains for errors on ambiguous emoji posts, historical/fan material, weak Barcelona mentions, and engagement posts. Because there was no net improvement, reject this prompt change and keep the prior extractor prompt as the next starting point.

### Exact fixes versus the no-extractor control

| Post ID | Source | Expected | Verdict change | Source post |
| --- | --- | --- | --- | --- |
| `1797221717787513308` | FabrizioRomano | Off-beat | On → off | 🚨 Kylian Mbappé to Real Madrid. HERE WE GO. https://t.co/hKfag3Hmru |
| `1567566164393328641` | Glongari | Off-beat | On → off | Now ✈️ from Rome to Istanbul. Mauro #Icardi with Wanda #Nara and their family ready for #Galatasaray 🟡🔴🦁 https://t.co/yxdBg0V6jj |
| `1414382001914777605` | talkfcb_ | Off-beat | On → off | Just Messi things 🐐 https://t.co/9dcF5pVfXh |
| `1684019030934315009` | BarcaUniversal | Off-beat | On → off | Image: DJ Khaled with Leo Messi. https://t.co/npg5aboAWo |
| `1682597961824456704` | BarcaUniversal | Off-beat | On → off | Image: Messi with Kim Kardashian's son. https://t.co/71ahkN089e |
| `1644110762644832256` | BarcaUniversal | Off-beat | On → off | There are rumours that Gerard Pique's girlfriend Clara Chia cheated on him with Pep Guardiola. — @sport https://t.co/uoDpjfV6EC |
| `1982258377272037386` | Barca_Buzz | On-beat | Off → on | "The Real Madrid captain will ask Lamine for respect". Also Dani Carvajal in 2017 https://t.co/7uphYE5cEU |
| `1972904491688272126` | laligaen | On-beat | Off → on | 🏴󠁧󠁢󠁥󠁮󠁧󠁿🌪️ Marcus Rashford at his brilliant BEST! No @FCBarcelona player has more goal involvements this season! https://t.co/4HA92uxlte |
| `1843334220632011171` | laligaen | On-beat | Off → on | The boys are back for international duty. https://t.co/CHuRgW81sx |
| `1749356225115181522` | MundoDeportivo | Off-beat | On → off | 😅 Más imágenes del partido de ayer en el Santiago Bernabéu ✏️ @r4six https://t.co/kghOiy3R6O |
| `1631565289807806465` | managingbarca | On-beat | Off → on | “Frenkie De Jong or Enzo Fernandez?” Jude Bellingham: “Frenkie” — “Gavi or Cody Gakpo?” Jude Bellingham: “Gavi” https://t.co/xFmfBYA2tg |
| `1895781015362425188` | footmercato | Off-beat | On → off | 3 dattes, un verre de lait... et il venait traumatiser la Ligue des Champions ! 🥛☝️ On ne verra plus 𝗞𝗮𝗿𝗶𝗺 𝗥𝗮𝗺𝗮𝗱𝗮𝗻 𝗕𝗲𝗻𝘇𝗲𝗺𝗮 sur nos écrans un soir de Ligue des Champions... 🥲 https://t.co/bnekowBGCY |
| `1582654473784430593` | footmercato | On-beat | Off → on | Vous le reconnaissez ? 👀 https://t.co/4z3K8RGeGU |

### Exact regressions versus the no-extractor control

| Post ID | Source | Expected | Verdict change | Source post |
| --- | --- | --- | --- | --- |
| `1534844533648801792` | Glongari | Off-beat | Off → on | ⏳ 🤝🔴🇺🇾 |
| `1420015686097768452` | Glongari | Off-beat | Off → on | 🚨#Chelsea have been running discussions for #Kounde for more than 2 weeks now. They want swop + money. #CFC first tried #Emerson but #Sevilla don’t like. Sevilla want 50M or less money And a player they like. Talks ongoing @tvdellosport |
| `1604840434601271296` | talkfcb_ | Off-beat | Off → on | If you have videos from your country celebrating Messi’s World Cup win, please feel free to send them over if you’d like for them to be included in my reaction video today! 🐐 |
| `1503002784811073542` | talkfcb_ | Off-beat | Off → on | PSG will always be a small club. https://t.co/bcoxSbGqY8 |
| `1259241342603067392` | talkfcb_ | Off-beat | Off → on | How is this even a debate? Eto’o won FOUR Champions League titles (two of which were treble seasons), with two different clubs, scoring in TWO finals! |
| `1719110059857252862` | BarcaTimes | Off-beat | Off → on | The little boy from Rosario, Argentina. ✨ https://t.co/s7EpnM0YbK |
| `1924227488453967993` | TotalBarca | On-beat | On → off | Our wingers in 20 years time 🙏 https://t.co/jD8R1WwQB1 |
| `1705652380417634786` | laligaen | On-beat | On → off | Scenes in Barcelona. https://t.co/mIhvy6Io5y |
| `1490675983485181961` | MundoDeportivo | On-beat | On → off | 💙❤️ @TomHolland1996 🤝 @FCBarcelona https://t.co/wu7ZczUFZa |
| `1949700092073590824` | sport | Off-beat | Off → on | 🔴Opinión SPORT 💸 Eu cobraré 10X se for preciso 🗣️"Mientras intento ver el partido de pretemporada del Barça en Japón, me llega un mensaje al móvil: “Hay lío grande con Vini...” ✍️@HugoScoccia https://t.co/Bfow2ZbaMr |
| `1147996471205257218` | sport | On-beat | On → off | 🥇 Alves, MVP #CopaAmerica 🤔 ¿Te gustaría verle de nuevo en el Camp Nou? ❤ Sí 🔄 No https://t.co/arT4JHXRgX |
| `1133442705172979712` | sport | On-beat | On → off | 🔵🔴 NEYMAR 🔵🔴 🧐 ¿Te gustaría volver a ver esta imagen? 🔃 Sí ❤ No https://t.co/aUpalynIsL |
| `1886411413352063027` | footmercato | Off-beat | Off → on | 2025… Je dis ça, je dis rien : surveillez le ciel, Ney arrive. ☝🏾🇧🇷 https://t.co/pWHYD30c23 |

## Extractor treatment 2: newest 50 posts with media and resolved X links

This input ablation kept the filtration instructions unchanged apart from correcting the stated corpus ceiling from 100 to 50. The extractor received the 50 newest posts, all eight of their original attachments, one attachment from a linked X post, and the content of all five non-media X-post links. No web-search tool was enabled. The exact sparse input snapshot is `extractor-evidence-50.jsonl`, and the generated guidance is [`t2-50-enriched.md`](../lab/voice-extractor/filtration-eval/guidance/t2-50-enriched.md).

The richer input demonstrably reached the extractor: it identified an otherwise opaque Lance Armstrong image and gaming GIF, and it resolved terse thread continuations to the underlying Barcelona posts. That better corpus understanding did not improve downstream filtration. The guidance scored **1,249/1,336 (93.49%)**: 12 fixes and 15 regressions, net −3. All three net errors were additional false positives; the confusion matrix changed from 786 TP / 466 TN / 58 FP / 26 FN to 786 TP / 463 TN / 61 FP / 26 FN.

The main failure is no longer missing corpus evidence. The extractor has almost entirely positive evidence about what Reshad posts, yet must invent negative filtration boundaries. It alternately treated commentary, fan material, historical figures, and rival news as exclusions or as broad Barcelona context, producing different errors rather than a more reliable boundary. Reject this generated guidance. Keep the separate owner decision to cap future extraction at the 50 most recent original posts.

### Exact fixes versus the no-extractor control

| Post ID | Source | Expected | Verdict change | Source post |
| --- | --- | --- | --- | --- |
| `1414382001914777605` | talkfcb_ | Off-beat | On → off | Just Messi things 🐐 https://t.co/9dcF5pVfXh |
| `1690516179117568000` | BarcaUniversal | Off-beat | On → off | Image: Messi and Antonela on a night out it Miami. https://t.co/ubS9ktmhn7 |
| `1684019030934315009` | BarcaUniversal | Off-beat | On → off | Image: DJ Khaled with Leo Messi. https://t.co/npg5aboAWo |
| `1644110762644832256` | BarcaUniversal | Off-beat | On → off | There are rumours that Gerard Pique's girlfriend Clara Chia cheated on him with Pep Guardiola. — @sport https://t.co/uoDpjfV6EC |
| `1982258377272037386` | Barca_Buzz | On-beat | Off → on | "The Real Madrid captain will ask Lamine for respect". Also Dani Carvajal in 2017 https://t.co/7uphYE5cEU |
| `1851040538641965321` | Barca_Buzz | Off-beat | On → off | 📲\| Pep Guardiola on instagram. https://t.co/H1oHkGzrf3 |
| `1762392969783754803` | Barca_Buzz | On-beat | Off → on | 📸 - Lamine Yamal with his mother. 😃❤️ https://t.co/mdi7A1SrYG |
| `2043723131903517132` | TotalBarca | Off-beat | On → off | Crazy: As President of Real Madrid, Florentino Perez has never won LALIGA in back-to-back seasons (ESPN) |
| `1605252143593635840` | TotalBarca | Off-beat | On → off | Everyone assumed this was his mom, but it was the national team cook! So awesome https://t.co/ku1Zrvp6sR |
| `1843334220632011171` | laligaen | On-beat | Off → on | The boys are back for international duty. https://t.co/CHuRgW81sx |
| `1164124111439892480` | sport | On-beat | Off → on | 🔥 Messi, entrenando a tope 🔵🔴 Si recibe el alta... ¿Debe ser titular ante el Betis? ❤️ Sí 🔄 No https://t.co/p2RnlCncnL |
| `1582654473784430593` | footmercato | On-beat | Off → on | Vous le reconnaissez ? 👀 https://t.co/4z3K8RGeGU |

### Exact regressions versus the no-extractor control

| Post ID | Source | Expected | Verdict change | Source post |
| --- | --- | --- | --- | --- |
| `1691030242473734145` | FabrizioRomano | Off-beat | Off → on | Neymar to Al Hilal, here we go! 🚨🔵🇸🇦 After new huge bid revealed two days ago, documents are now approved by all parties involved. Ney will travel to Saudi this week. Two year contract. Number 🔟. PSG set to receive bit less than €100m fee. Medical to be completed today. https://t.co/R6zR5glroe |
| `1534844533648801792` | Glongari | Off-beat | Off → on | ⏳ 🤝🔴🇺🇾 |
| `1503002784811073542` | talkfcb_ | Off-beat | Off → on | PSG will always be a small club. https://t.co/bcoxSbGqY8 |
| `1259241342603067392` | talkfcb_ | Off-beat | Off → on | How is this even a debate? Eto’o won FOUR Champions League titles (two of which were treble seasons), with two different clubs, scoring in TWO finals! |
| `1899954965222764716` | BarcaUniversal | Off-beat | Off → on | Real Madrid have just completed one of the most shameless robberies in football history. https://t.co/Iz8hXjOz51 |
| `1719110059857252862` | BarcaTimes | Off-beat | Off → on | The little boy from Rosario, Argentina. ✨ https://t.co/s7EpnM0YbK |
| `1912620179256664288` | Barca_Buzz | Off-beat | Off → on | Carlo stay! |
| `1716415703660781682` | Barca_Buzz | On-beat | On → off | 📸 - 7yo Marc Guiu with Lionel Messi. https://t.co/E6CAC1RC48 |
| `1711436105831374991` | Barca_Buzz | Off-beat | Off → on | Pep Guardiola at a fashion show in 1993. 🤩 https://t.co/zrZtEYG76e |
| `1924227488453967993` | TotalBarca | On-beat | On → off | Our wingers in 20 years time 🙏 https://t.co/jD8R1WwQB1 |
| `1853131113965007320` | TotalBarca | On-beat | On → off | No way a human being gets this call right. https://t.co/cie82WQ24O |
| `1813184052947509261` | laligaen | On-beat | On → off | ʙᴀʀᴄ̧ᴀ ʙᴏʏꜱ. https://t.co/C22lChQxU4 |
| `1809296679931084868` | sport | Off-beat | Off → on | Lehmann: "España es pequeña e inexperta, como un equipo juvenil" España: https://t.co/Cn8qk3GPCS |
| `1133442705172979712` | sport | On-beat | On → off | 🔵🔴 NEYMAR 🔵🔴 🧐 ¿Te gustaría volver a ver esta imagen? 🔃 Sí ❤ No https://t.co/aUpalynIsL |
| `1886411413352063027` | footmercato | Off-beat | Off → on | 2025… Je dis ça, je dis rien : surveillez le ciel, Ney arrive. ☝🏾🇧🇷 https://t.co/pWHYD30c23 |

## Next experiment

1. Edit only `lab/voice-extractor/filtration-eval/extractor-prompt.md`.
2. Run the extractor over Reshad's stated beat and the fixed enriched 50-post corpus to produce filtration guidance.
3. Inject that guidance into the unchanged downstream control.
4. Evaluate all 1,336 rows.
5. Record accuracy, fixes, regressions, and the decision in this file.
