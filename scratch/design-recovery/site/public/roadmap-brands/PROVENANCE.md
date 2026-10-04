# Official roadmap artwork

Collected September 30, 2026. Local preview assets downloaded from the publishers’ own sites, official static hosts and publisher-maintained Google Play listings. No logo was drawn, recolored, filtered or replaced by a text glyph. Instagram retains its gradient; TikTok retains the cyan, red and white artwork; Google News retains its multicolor panels; Yahoo Finance uses its official purple app icon. X and Threads remain monochrome.

Messenger uses the current Facebook Blue icon. Meta’s official [Messenger guidelines](https://www.meta.com/en-gb/brand/resources/facebook/messenger-icon/) say the icon changed in February 2025 and its primary version is Facebook Blue. The preview uses that current artwork.

The manifest is `content/official-roadmap-assets.ts`. Each entry records its local path, exact download URL, publisher page and license status. Publisher assets are not covered by a blanket open-source license; brand rights remain with each publisher. These assets are a preview representation, not endorsement or a claim of working integrations.

| Platform | Local asset | Exact publisher asset source |
| --- | --- | --- |
| instagram | `/roadmap-brands/instagram.webp` | [Official asset](https://static.cdninstagram.com/rsrc.php/yw/r/icwX0xAk0pz.webp) |
| reddit | `/roadmap-brands/reddit.png` | [Official asset](https://www.redditstatic.com/desktop2x/img/favicon/favicon-96x96.png) |
| linkedin | `/roadmap-brands/linkedin.png` | [Official asset](https://static.licdn.com/aero-v1/sc/h/al2o9zrvru7aqj8e1x2rzsrca) |
| facebook | `/roadmap-brands/facebook.png` | [Official asset](https://static.xx.fbcdn.net/rsrc.php/y1/r/ay1hV6OlegS.ico) |
| threads | `/roadmap-brands/threads.webp` | [Official asset](https://static.cdninstagram.com/rsrc.php/yn/r/fFvbm7ecCaM.webp) |
| whatsapp | `/roadmap-brands/whatsapp-app.png` | [Official Android listing](https://play.google.com/store/apps/details?id=com.whatsapp&hl=en_US) |
| messenger | `/roadmap-brands/messenger.png` | [Official asset](https://static.xx.fbcdn.net/rsrc.php/yO/r/qa11ER6rke_.ico) |
| snapchat | `/roadmap-brands/snapchat.png` | [Official asset](https://static.snapchat.com/images/favicon/favicon-192x192.png) |
| tiktok | `/roadmap-brands/tiktok-app.png` | [Official Android listing](https://play.google.com/store/apps/details?id=com.zhiliaoapp.musically&hl=en_US) |
| x | `/roadmap-brands/x.png` | [Official asset](https://x.com/apple-touch-icon.png) |
| youtube | `/roadmap-brands/youtube.png` | [Official asset](https://www.youtube.com/s/desktop/d57c41d2/img/favicon_144x144.png) |
| yahoofinance | `/roadmap-brands/yahoofinance.png` | [Official asset](https://s.yimg.com/cv/apiv2/default/finance/favicon-180x180.png) |
| googlenews | `/roadmap-brands/googlenews.png` | [Official asset](https://www.gstatic.com/gnews/logo/google_news_192.png) |

Homepage metadata was inspected for all platforms except Reddit, whose direct homepage request was blocked. Its real full-color asset was retrieved from Reddit’s own `redditstatic.com` asset host.

Facebook, LinkedIn and Messenger official ICO files were exported to PNG using the largest original frame, with all colors and artwork unchanged. TikTok’s official favicon response already contained PNG image data; its local `.png` file preserves that artwork. Original icon downloads are retained beside the PNG exports. The TikTok favicon is retained as an earlier source, while the selected 512-pixel Android app icon is a direct copy. All other selected image files are direct copies.

Initial verification: all 13 original manifest paths existed. Every download returned HTTP 200 with an image content type. Raster assets were decoded and inspected together; the earlier WhatsApp SVG is the official site icon. No installation, authentication action or service write was performed.


## Direct presentation update, September 30

The selected assets now include GitHub, Product Hunt and Slack, for 16 platforms. GitHub uses the current 2026 toolkit's unmodified black SVG on a light page and its separately supplied white SVG on a dark page. The two files come from `GitHub Logos/SVG/GitHub_Invertocat_Black.svg` and `GitHub Logos/SVG/GitHub_Invertocat_White.svg` in the [official logo archive](https://brand.github.com/GitHub_Logos.zip). The [GitHub logo guidelines](https://brand.github.com/foundations/logo) permit references and integration identification and prohibit effects, altered proportions and recoloring.

Product Hunt uses `Product-Hunt-logo-all-1022/Pixels/product-hunt-logo-orange-960.png` from its [official logo archive](https://s3.producthunt.com/static/Product-Hunt-logo-all-1022.zip). This is a 960-pixel orange circle with transparent space outside it. [Product Hunt's guidelines](https://www.producthunt.com/branding) allow references to Product Hunt and require the original color, proportions and orientation.

Slack uses the unmodified 256-pixel [publisher app artwork](https://a.slack-edge.com/80588/marketing/img/meta/slack_hash_256.png), referenced in the metadata of its [media kit](https://slack.com/media-kit). Its purple background and multicolor mark are part of the artwork. Use remains subject to Slack's brand guidelines and terms.

WhatsApp and TikTok now use the unmodified 512-pixel Android app icons from their publisher-maintained [WhatsApp](https://play.google.com/store/apps/details?id=com.whatsapp&hl=en_US) and [TikTok](https://play.google.com/store/apps/details?id=com.zhiliaoapp.musically&hl=en_US) Google Play listings. The exact Google-hosted image URLs are recorded in the manifest. WhatsApp's green app background and TikTok's black app background belong to the original artwork. Neither was manufactured or recolored. The downloadable 2026 WhatsApp brand pack was also inspected and provides an outline glyph rather than this app icon. App-store artwork has no stated general redistribution license; publisher brand rights remain intact.

| Added platform | Local asset | Source |
| --- | --- | --- |
| GitHub | `/roadmap-brands/github.svg`, `/roadmap-brands/github-white.svg` | [Current official brand kit](https://brand.github.com/foundations/logo) |
| Product Hunt | `/roadmap-brands/producthunt.png` | [Official logo downloads](https://www.producthunt.com/branding) |
| Slack | `/roadmap-brands/slack.png` | [Official media kit](https://slack.com/media-kit) |

Presentation recommendation: show the original artwork directly on the page, with the same visual size and enough empty space around each mark. Do not wrap every mark in an added white square, apply color filters, or use shadow effects on GitHub. Existing app backgrounds belong to the original icons and should remain. The Email channel should use the existing generic Mail icon from Lucide; Gmail would incorrectly identify a single provider. No Gmail asset is added.

Verification: the new downloads returned HTTP 200, all 16 manifest entries and the GitHub dark variant resolve to existing local files, and the raster artwork was visually inspected. Components and page styling were not changed in this asset update.
