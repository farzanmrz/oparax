# Real source pack: Europa Clipper launch

Verified September 29, 2026. Research only. Nothing was added to the preview or product.

## Recommended coherent example

One genuine event gives three useful source formats: NASA's official news article, a matching NASA X post, and a later mission-blog update. The event is historical, October 14, 2024. Do not present it as current news or a real Oparax monitoring result.

### Official article

- Headline: **Liftoff! NASA’s Europa Clipper Sails Toward Ocean Moon of Jupiter**
- Publisher: NASA. Date: October 14, 2024. Release 24-129.
- [Original article](https://www.nasa.gov/news-release/liftoff-nasas-europa-clipper-sails-toward-ocean-moon-of-jupiter/)
- Independently written short summary and reusable fields are in `verified-content.json`.
- Keep the mission's purpose accurate: investigating potentially habitable conditions, not detecting life.

### Matching X post

- NASA, @NASA. October 14, 2024.
- [Original post](https://x.com/NASA/status/1845859399178264640)
- Verified excerpt, 14 words, from the middle of the post:

> @EuropaClipper launched from @NASAKennedy at 12:06pm ET (16:06 UTC) on a @SpaceX Falcon Heavy

Label this as an excerpt. Do not add invented engagement numbers, verification badges, a synthetic NASA avatar or extra quotation text. An authentic source avatar is now available below.

**Verification:** the public [X oEmbed endpoint](https://publish.twitter.com/oembed?url=https://twitter.com/NASA/status/1845859399178264640&omit_script=true) returned the canonical URL, NASA author identity and quoted text through an unauthenticated HTTPS request. The same post is embedded in [INAF's contemporaneous report](https://www.media.inaf.it/2024/10/15/lancio-europa-clipper/), which supplied the original status ID.

**Access limit:** direct x.com access through the web reader returned HTTP 403. The public oEmbed response succeeded through the shell. This verifies a short excerpt without assuming a live embed will work in the preview. No react-tweet, X SDK, personal browser or live embed was used.

### Optional later source

- Headline: **Solar Arrays on NASA’s Europa Clipper Fully Deployed in Space**
- Publisher: NASA Science. October 14, 2024, displayed time 3:26PM (page does not label its time zone).
- [Original blog update](https://science.nasa.gov/blogs/europa-clipper/2024/10/14/solar-arrays-on-nasas-europa-clipper-fully-deployed-in-space-2/)
- Added fact: mission controllers confirmed both solar arrays unfolded after launch.
- Useful for an example of a later report. Do not claim this fact was absent from every earlier version of the release, or that Oparax actually processed these sources.

## Image and rights

Saved: `europa-clipper-launch-nasa-kim-shiflett-600.jpg`, 600 x 400, 30,610 bytes. Credit: **NASA/Kim Shiflett**. Hash and exact download URL are in JSON. The 600-pixel derivative is offered in the official article's image srcset; no image editing was performed.

[Official image](https://www.nasa.gov/wp-content/uploads/2024/10/54067151504-46075ee405-k.jpg) | [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)

NASA generally permits factual informational reuse of its material with credit and without implied endorsement. Its current guidelines are not a blanket unrestricted license: NASA logos and identifiable employees can require clearance in promotional contexts. The downloaded distant-launch photograph was visually inspected and has no identifiable people or prominent NASA insignia. Use it as credited article evidence, not Oparax brand imagery. The initial pack had no avatar; the scoped source-identity follow-up below adds the exact official X avatar. Model-written text should remain attributed to Oparax, with original-source links kept separate.

## Why only one topic

The host narrowed the research to one excellent verified example. FC Barcelona and rail were not padded out with uncertain image rights or fabricated posts. This pack supplies a real image, genuine article identity and verified source excerpt for recognizable presentation. Additional topics can be researched if needed later.


## Follow-up: genuine NASA X avatar

Saved `nasa-x-avatar-official-normal.jpg` (2,491 bytes), unchanged official normal derivative. The [public tweet syndication response](https://cdn.syndication.twimg.com/tweet-result?id=1845859399178264640&lang=en&token=0) identified the author as NASA, screen name NASA, and returned this exact [profile image URL](https://pbs.twimg.com/profile_images/1321163587679784960/0ZxKlEKB_normal.jpg). The image was visually inspected and is NASA's blue insignia. Detailed provenance and hash are in `nasa-avatar-provenance.json` and the main JSON.

Use is scoped to reproducing the real source identity on the NASA post card. This is not a license to use the insignia as Oparax branding, and no permission or endorsement is implied. See [NASA's brand rules](https://www.nasa.gov/nasa-brand-center/brand-guidelines/).

Image access through Python urllib returned 403; curl with a standard browser User-Agent succeeded. No cookies or credentials were used. No react-tweet install or live embed was involved.
