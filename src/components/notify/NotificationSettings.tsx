"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { Category, Prefs } from "@/lib/push-prefs";
import { CATEGORIES } from "@/lib/push-prefs";
import { currentSubscription, disablePush, enablePush, loadPrefs, pushSupport, savePrefs, sendTestPush } from "@/lib/push-client";
import type { PushSupport } from "@/lib/push-client";
import { alertSoundOn, setAlertSound, subscribeAlertSound } from "@/lib/sfx";

const GROUPS = [
  { key: "game", title: "Game night" },
  { key: "content", title: "New video, audio and news" },
  { key: "off", title: "Off days" },
  { key: "fun", title: "Just for fun" },
] as const;

function Switch({ on, label, onChange, disabled = false }: { on: boolean; label: string; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-[46px] shrink-0 rounded-full transition-colors disabled:opacity-40 ${on ? "bg-sens" : "bg-line-strong"}`}
    >
      <span className={`absolute top-[3px] size-[22px] rounded-full bg-white transition-[left] ${on ? "left-[21px]" : "left-[3px]"}`} />
    </button>
  );
}

export function NotificationSettings() {
  const [support, setSupport] = useState<PushSupport | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const sound = useSyncExternalStore(subscribeAlertSound, alertSoundOn, () => true);

  useEffect(() => {
    let live = true;
    currentSubscription().then((s) => {
      if (!live) return;
      setSupport(pushSupport());
      setEnabled(!!s);
      setPrefs(loadPrefs());
    });
    return () => {
      live = false;
    };
  }, []);

  const update = (next: Prefs) => {
    setPrefs(next);
    if (enabled) void savePrefs(next);
  };
  const toggle = (k: Category, v: boolean) => prefs && update({ ...prefs, on: v ? [...prefs.on, k] : prefs.on.filter((x) => x !== k) });

  const turnOn = async () => {
    if (!prefs) return;
    setBusy(true);
    setError(null);
    const err = await enablePush(prefs);
    setBusy(false);
    setSupport(pushSupport());
    if (err) setError(err);
    else setEnabled(true);
  };
  const turnOff = async () => {
    setBusy(true);
    await disablePush();
    setBusy(false);
    setEnabled(false);
  };

  const row = "flex min-h-[52px] items-center gap-3 border-b border-line px-3.5 py-2.5 last:border-0";
  return (
    <div id="notifications" className="flex scroll-mt-4 flex-col gap-1 px-4 pt-8 pb-8">
      {/* Desktop: game-night alerts on the left; content, off-day, fun, quiet hours and sounds on the right. */}
      <h2 className="px-1 font-display text-2xl font-bold uppercase tracking-wider">Notifications</h2>
      <p className="text-sm text-muted">On this phone. Choose what Sicko Central sends you, even when it&apos;s closed.</p>

      {support === "ios-install" && (
        <div className="mt-3 flex gap-2.5 rounded-xl border border-gold-line bg-gold-ground px-3.5 py-3 text-sm text-ink-2">
          <span aria-hidden="true">📱</span>
          <span>On iPhone, notifications work once Sicko Central is on your Home Screen: tap Share, then Add to Home Screen, and open it from there.</span>
        </div>
      )}
      {support === "denied" && (
        <div className="mt-3 rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-ink-2">Notifications are blocked for this site. Allow them in your browser or phone settings, then come back.</div>
      )}

      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3">
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{enabled ? "Notifications are on" : "Notifications are off"}</div>
          <div className="text-xs text-muted">{enabled ? "Change what you get below." : "Turn them on to pick what you get."}</div>
        </div>
        {enabled ? (
          <button type="button" disabled={busy} onClick={turnOff} className="min-h-10 rounded-xl border border-line-strong px-3.5 text-sm font-semibold">
            Turn off
          </button>
        ) : (
          <button type="button" disabled={busy || support === "unsupported" || support === "ios-install" || support === "denied"} onClick={turnOn} className="min-h-10 rounded-xl bg-sens px-3.5 text-sm font-bold text-white disabled:opacity-40">
            {busy ? "Turning on…" : "Turn on"}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-sens-text">{error}</p>}
      {enabled && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              setTestMsg("Sending…");
              setTestMsg(await sendTestPush());
            }}
            className="min-h-10 rounded-xl border border-line-strong px-3.5 text-sm font-semibold"
          >
            Send a test notification
          </button>
          {testMsg && <span className="text-sm text-muted">{testMsg}</span>}
        </div>
      )}

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-8">
      <div>
      {prefs &&
        GROUPS.filter((g) => g.key === "game").map((g) => (
          <section key={g.key} className="pt-4">
            <h2 className="px-1 pb-2 font-display text-xl font-bold uppercase tracking-wider">{g.title}</h2>
            <div className={`overflow-hidden rounded-2xl border border-line bg-surface ${enabled ? "" : "opacity-60"}`}>
              {CATEGORIES.filter((c) => c.group === g.key).map((c) => (
                <div key={c.key} className={row}>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold">{c.title}</div>
                    {c.sub && <div className="text-xs text-muted">{c.sub}</div>}
                  </div>
                  {c.key === "pre" && (
                    <select
                      aria-label="Minutes before puck drop"
                      value={prefs.remind}
                      onChange={(e) => update({ ...prefs, remind: e.target.value === "60" ? 60 : 30 })}
                      className="min-h-9 rounded-lg border border-line-strong bg-surface-2 px-2 text-xs font-bold"
                    >
                      <option value="30">30 min</option>
                      <option value="60">60 min</option>
                    </select>
                  )}
                  <Switch on={prefs.on.includes(c.key)} label={c.title} onChange={(v) => toggle(c.key, v)} />
                </div>
              ))}
            </div>
          </section>
        ))}

      </div>
      <div>
      {prefs &&
        GROUPS.filter((g) => g.key !== "game").map((g) => (
          <section key={g.key} className="pt-4">
            <h2 className="px-1 pb-2 font-display text-xl font-bold uppercase tracking-wider">{g.title}</h2>
            <div className={`overflow-hidden rounded-2xl border border-line bg-surface ${enabled ? "" : "opacity-60"}`}>
              {CATEGORIES.filter((c) => c.group === g.key).map((c) => (
                <div key={c.key} className={row}>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold">{c.title}</div>
                    {c.sub && <div className="text-xs text-muted">{c.sub}</div>}
                  </div>
                  <Switch on={prefs.on.includes(c.key)} label={c.title} onChange={(v) => toggle(c.key, v)} />
                </div>
              ))}
            </div>
          </section>
        ))}
      {prefs && (
        <section className="pt-4">
          <h2 className="px-1 pb-2 font-display text-xl font-bold uppercase tracking-wider">Quiet hours</h2>
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className={row}>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold">11 p.m. to 8 a.m.</div>
                <div className="text-xs text-muted">Holds video, news and off-day alerts overnight. Game alerts still come through.</div>
              </div>
              <Switch on={prefs.quiet} label="Quiet hours" onChange={(v) => update({ ...prefs, quiet: v })} />
            </div>
          </div>
        </section>
      )}

      <section className="pt-4">
        <h2 className="px-1 pb-2 font-display text-xl font-bold uppercase tracking-wider">While the app is open</h2>
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className={row}>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold">Alert sounds</div>
              <div className="text-xs text-muted">The goal horn and pop-ups on the Game page</div>
            </div>
            <Switch on={sound} label="Alert sounds" onChange={(v) => setAlertSound(v)} />
          </div>
        </div>
      </section>
      </div>
      </div>
    </div>
  );
}
