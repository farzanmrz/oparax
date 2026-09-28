"use server";

import {
  followRepoForOwner,
  portalForOwner,
  refreshCountsForOwner,
  setAlertHourForOwner,
  setDigestForOwner,
  setWatchedForOwner,
  unfollowRepoForOwner,
} from "@/lib/settings/accounts";
import {
  addSourceForOwner,
  removeSourceForOwner,
  setNoFilterForOwner,
} from "@/lib/settings/sources";

export async function addSource(handle: string, url: string) {
  return addSourceForOwner(handle, url);
}
export async function removeSource(handle: string, sourceId: string) {
  return removeSourceForOwner(handle, sourceId);
}
export async function setNoFilter(handle: string, sourceId: string, on: boolean) {
  return setNoFilterForOwner(handle, sourceId, on);
}
export async function setWatched(handle: string, accountHandle: string, on: boolean) {
  return setWatchedForOwner(handle, accountHandle, on);
}
export async function refreshCounts(handle: string) {
  return refreshCountsForOwner(handle);
}
export async function setAlertHour(handle: string, hour: number, timezone: string) {
  return setAlertHourForOwner(handle, hour, timezone);
}
export async function setDigest(handle: string, kind: "github" | "product_hunt", on: boolean) {
  return setDigestForOwner(handle, kind, on);
}
export async function followRepo(handle: string, repo: string, threshold: number) {
  return followRepoForOwner(handle, repo, threshold);
}
export async function unfollowRepo(handle: string, repo: string) {
  return unfollowRepoForOwner(handle, repo);
}
export async function openPortal(handle: string) {
  return portalForOwner(handle);
}
