export type OfficialRoadmapAsset = {
  src: string;
  darkSrc?: string;
  source: string;
  publisherPage: string;
  license: string;
  monochrome?: boolean;
  conversion?: string;
  note?: string;
  archiveMember?: string;
};

export const officialRoadmapAssets: Record<string, OfficialRoadmapAsset> = {
  instagram: {
    src: "/roadmap-brands/instagram.webp",
    source: "https://static.cdninstagram.com/rsrc.php/yw/r/icwX0xAk0pz.webp",
    license:
      "Official publisher asset. No general redistribution license is stated; brand rights remain with the publisher.",
    publisherPage: "https://www.instagram.com",
  },
  reddit: {
    src: "/roadmap-brands/reddit.png",
    source: "https://www.redditstatic.com/desktop2x/img/favicon/favicon-96x96.png",
    license:
      "Official publisher asset. No general redistribution license is stated; brand rights remain with the publisher.",
    publisherPage: "https://www.reddit.com",
    note: "Downloaded from the official Reddit static asset host; direct homepage metadata retrieval was blocked.",
  },
  linkedin: {
    src: "/roadmap-brands/linkedin.png",
    source: "https://static.licdn.com/aero-v1/sc/h/al2o9zrvru7aqj8e1x2rzsrca",
    license:
      "Official publisher asset. No general redistribution license is stated; brand rights remain with the publisher.",
    conversion:
      "Lossless PNG export of the largest frame in the downloaded official icon; colors and artwork unchanged.",
    publisherPage: "https://www.linkedin.com",
  },
  facebook: {
    src: "/roadmap-brands/facebook.png",
    source: "https://static.xx.fbcdn.net/rsrc.php/y1/r/ay1hV6OlegS.ico",
    license:
      "Official publisher asset. No general redistribution license is stated; brand rights remain with the publisher.",
    conversion:
      "Lossless PNG export of the largest frame in the downloaded official icon; colors and artwork unchanged.",
    publisherPage: "https://www.facebook.com",
  },
  threads: {
    src: "/roadmap-brands/threads.webp",
    source: "https://static.cdninstagram.com/rsrc.php/yn/r/fFvbm7ecCaM.webp",
    license:
      "Official publisher asset. No general redistribution license is stated; brand rights remain with the publisher.",
    monochrome: true,
    publisherPage: "https://www.threads.com",
  },
  whatsapp: {
    src: "/roadmap-brands/whatsapp-app.png",
    source:
      "https://play-lh.googleusercontent.com/Gqxk4T0uZsDwFp07DE-508hkyvcNmgFuRwPiwTEfF7D7OzGv1FdHDzEyMxNsSBZLOJlGpe3ULvVM2RgrRAlBqA=s0-br30",
    license:
      "Official publisher asset. No general redistribution license is stated; brand rights remain with the publisher.",
    publisherPage: "https://play.google.com/store/apps/details?id=com.whatsapp&hl=en_US",
    note: "Unmodified 512-pixel Android app icon from the publisher's official Google Play listing. The green background belongs to the original artwork.",
  },
  messenger: {
    src: "/roadmap-brands/messenger.png",
    source: "https://static.xx.fbcdn.net/rsrc.php/yO/r/qa11ER6rke_.ico",
    license:
      "Official publisher asset. No general redistribution license is stated; brand rights remain with the publisher.",
    conversion:
      "Lossless PNG export of the largest frame in the downloaded official icon; colors and artwork unchanged.",
    note: "The official current icon is Facebook Blue. Meta updated the icon in February 2025; the historical gradient is not the current official primary asset.",
    publisherPage: "https://www.messenger.com",
  },
  snapchat: {
    src: "/roadmap-brands/snapchat.png",
    source: "https://static.snapchat.com/images/favicon/favicon-192x192.png",
    license:
      "Official publisher asset. No general redistribution license is stated; brand rights remain with the publisher.",
    publisherPage: "https://www.snapchat.com",
  },
  tiktok: {
    src: "/roadmap-brands/tiktok-app.png",
    source:
      "https://play-lh.googleusercontent.com/2o7iuqPe-0msP3DvNhzoOgNo4eZ6GkL_RtGVeKyBn5UBQAW5cw-GW5V3wDOHB1yTQuqWzrFLFOv2u4_5ea1uhg=s0-br30",
    license:
      "Official publisher asset. No general redistribution license is stated; brand rights remain with the publisher.",
    publisherPage:
      "https://play.google.com/store/apps/details?id=com.zhiliaoapp.musically&hl=en_US",
    note: "Unmodified 512-pixel Android app icon replaces the 32-pixel website favicon. The black background belongs to the original artwork.",
  },
  x: {
    src: "/roadmap-brands/x.png",
    source: "https://x.com/apple-touch-icon.png",
    license:
      "Official publisher asset. No general redistribution license is stated; brand rights remain with the publisher.",
    monochrome: true,
    publisherPage: "https://x.com",
  },
  youtube: {
    src: "/roadmap-brands/youtube.png",
    source: "https://www.youtube.com/s/desktop/d57c41d2/img/favicon_144x144.png",
    license:
      "Official publisher asset. No general redistribution license is stated; brand rights remain with the publisher.",
    publisherPage: "https://www.youtube.com",
  },
  yahoofinance: {
    src: "/roadmap-brands/yahoofinance.png",
    source: "https://s.yimg.com/cv/apiv2/default/finance/favicon-180x180.png",
    license:
      "Official publisher asset. No general redistribution license is stated; brand rights remain with the publisher.",
    publisherPage: "https://finance.yahoo.com",
  },
  googlenews: {
    src: "/roadmap-brands/googlenews.png",
    source: "https://www.gstatic.com/gnews/logo/google_news_192.png",
    license:
      "Official publisher asset. No general redistribution license is stated; brand rights remain with the publisher.",
    publisherPage: "https://news.google.com",
  },
  github: {
    src: "/roadmap-brands/github.svg",
    darkSrc: "/roadmap-brands/github-white.svg",
    source: "https://brand.github.com/GitHub_Logos.zip",
    archiveMember: "GitHub Logos/SVG/GitHub_Invertocat_Black.svg",
    publisherPage: "https://brand.github.com/foundations/logo",
    license:
      "GitHub trademarks remain GitHub's property. Official guidelines permit linking to GitHub, identifying integrations and editorial references; no general open-source license applies.",
    monochrome: true,
    note: "The dark version is the separate official GitHub_Invertocat_White.svg archive member. Select the matching original asset for the page background without recoloring or filters.",
  },
  producthunt: {
    src: "/roadmap-brands/producthunt.png",
    source: "https://s3.producthunt.com/static/Product-Hunt-logo-all-1022.zip",
    archiveMember: "Product-Hunt-logo-all-1022/Pixels/product-hunt-logo-orange-960.png",
    publisherPage: "https://www.producthunt.com/branding",
    license:
      "Product Hunt permits these files for references to Product Hunt under its branding guidelines. Colors, proportions and orientation must remain unchanged; brand rights remain with Product Hunt.",
    note: "Unmodified 960-pixel orange circular mark with transparent space outside the circle.",
  },
  slack: {
    src: "/roadmap-brands/slack.png",
    source: "https://a.slack-edge.com/80588/marketing/img/meta/slack_hash_256.png",
    publisherPage: "https://slack.com/media-kit",
    license:
      "Official Slack artwork. Use is subject to Slack's brand guidelines and terms; brand rights remain with Slack, and no general open-source license applies.",
    note: "Unmodified 256-pixel full-color Slack app artwork. The purple background belongs to the publisher asset.",
  },
};
