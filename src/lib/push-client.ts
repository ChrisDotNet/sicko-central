"use client";

// The phone's side of push notifications: register the service worker, subscribe, and keep
// the server's copy of this phone's choices up to date. Choices are also kept on the phone.
import type { Prefs } from "./push-prefs";
import { DEFAULT_PREFS, cleanPrefs } from "./push-prefs";
import { getFavourites } from "./favourites";

const KEY = "sicko:notify-prefs";

export type PushSupport = "ok" | "unsupported" | "ios-install" | "denied";

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
  if (ios && !standalone) return "ios-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return "ok";
}

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? cleanPrefs(JSON.parse(raw)) : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

function storePrefs(p: Prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* fine */
  }
}

function urlBase64ToUint8Array(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration() {
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== "ok") return null;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    return (await reg?.pushManager.getSubscription()) ?? null;
  } catch {
    return null;
  }
}

async function send(sub: PushSubscription, prefs: Prefs): Promise<boolean> {
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON(), prefs: { ...prefs, favs: [...getFavourites()] } }),
  });
  return res.ok;
}

// Ask permission (must follow a tap), subscribe and save. Returns an error message or null.
export async function enablePush(prefs: Prefs): Promise<string | null> {
  const support = pushSupport();
  if (support === "ios-install") return "On iPhone, add Sicko Central to your Home Screen first, then open it from there.";
  if (support === "unsupported") return "This browser can't receive notifications.";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "Notifications are blocked. Allow them for this site in your phone's settings.";
  const keyRes = await fetch("/api/push/key").then((r) => r.json()).catch(() => null);
  if (!keyRes?.enabled || !keyRes.key) return "Notifications aren't set up on the site yet.";
  try {
    const reg = await registration();
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(keyRes.key) }));
    storePrefs(prefs);
    return (await send(sub, prefs)) ? null : "Couldn't save your choices. Try again in a minute.";
  } catch {
    return "Couldn't turn on notifications on this phone.";
  }
}

export async function savePrefs(prefs: Prefs): Promise<void> {
  storePrefs(prefs);
  const sub = await currentSubscription();
  if (sub) await send(sub, prefs).catch(() => {});
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await fetch("/api/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}

// Ask the server for a test notification to this phone. Returns a short status message.
export async function sendTestPush(): Promise<string> {
  const sub = await currentSubscription();
  if (!sub) return "Turn notifications on first.";
  const res = await fetch("/api/push/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => null);
  const result = (await res?.json().catch(() => null))?.result;
  if (result === "sent") return "Sent. It should arrive in a few seconds.";
  if (result === "too-soon") return "One test a minute. Try again shortly.";
  if (result === "not-found") return "This phone isn't signed up on the server. Turn notifications off and on again.";
  return "Couldn't send it. Try turning notifications off and on again.";
}
