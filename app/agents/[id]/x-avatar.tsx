"use client";

// An X profile picture resolved by HANDLE, for the two places no tweet payload carries one:
// the draft card (the linked account never appears in the syndication data) and a source
// card's archive fallback (the post is gone, and its avatar went with it). Resolution goes
// through unavatar.io — a public redirect onto X's own CDN — because we deliberately store no
// avatar: the X OAuth link captures handle + tokens only, and a stored image URL would just
// go stale when the user changes it. Client component solely for `onError`: when unavatar
// misses (rate limit, renamed account), the monogram takes over instead of a broken image.
import { useState } from "react";
import styles from "./source-tweet.module.css";

export function XAvatar({ handle }: { handle: string | null }) {
  const [failed, setFailed] = useState(false);

  if (!handle) return <span aria-hidden="true" className={styles.monogram}>?</span>;

  if (failed) {
    return (
      <span aria-hidden="true" className={styles.monogram}>
        {handle.slice(0, 1).toUpperCase()}
      </span>
    );
  }
  return (
    // biome-ignore lint/performance/noImgElement: a 20px avatar via unavatar's redirect — next/image would only proxy the redirect
    <img
      alt=""
      className={styles.avatar}
      onError={() => setFailed(true)}
      src={`https://unavatar.io/x/${encodeURIComponent(handle)}?fallback=false`}
    />
  );
}
