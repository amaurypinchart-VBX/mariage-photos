"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PhotoChallenge } from "@/lib/types";
import Uploader from "./Uploader";

export default function Roulette({
  eventId,
  slug,
  challenges,
}: {
  eventId: string;
  slug: string;
  challenges: PhotoChallenge[];
}) {
  const key = `eclats:defis:${slug}`;
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [current, setCurrent] = useState<PhotoChallenge | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [reelText, setReelText] = useState("Appuie sur « Tourner »");
  const [capturing, setCapturing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setDone(JSON.parse(raw));
    } catch {
      /* ignoré */
    }
  }, [key]);

  function persist(next: Record<string, boolean>) {
    setDone(next);
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* ignoré */
    }
  }

  // Nombre de défis "normaux" (déblocables direct) déjà réalisés.
  const regularDone = useMemo(
    () =>
      challenges.filter((c) => c.unlock_threshold === 0 && done[c.id]).length,
    [challenges, done]
  );

  function isUnlocked(c: PhotoChallenge) {
    return regularDone >= c.unlock_threshold;
  }

  function spin() {
    if (spinning) return;
    const unlocked = challenges.filter(isUnlocked);
    const pool = unlocked.filter((c) => !done[c.id]);
    const draw = pool.length ? pool : unlocked;
    if (draw.length === 0) return;

    setCapturing(false);
    setSpinning(true);
    let ticks = 0;
    const max = 16 + Math.floor(Math.random() * 6);
    const iv = setInterval(() => {
      const pick = draw[Math.floor(Math.random() * draw.length)];
      setReelText(pick.label);
      setCurrent(pick);
      ticks += 1;
      if (ticks >= max) {
        clearInterval(iv);
        setSpinning(false);
      }
    }, 70);
  }

  function onChallengeDone() {
    if (!current) return;
    persist({ ...done, [current.id]: true });
    burst();
  }

  function burst() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const r = cv.getBoundingClientRect();
    cv.width = r.width;
    cv.height = r.height;
    const cols = ["#B08748", "#4F6152", "#D6AC74", "#9DB39B", "#EFE6D4"];
    const parts = Array.from({ length: 70 }, (_, i) => ({
      x: cv.width / 2,
      y: cv.height * 0.35,
      vx: (Math.random() - 0.5) * 7,
      vy: Math.random() * -7 - 2,
      g: 0.22,
      s: 4 + Math.random() * 5,
      c: cols[i % cols.length],
      a: 1,
      rot: Math.random() * 6,
    }));
    const tick = () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      let alive = false;
      for (const p of parts) {
        p.vy += p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.a -= 0.012;
        p.rot += 0.1;
        if (p.a > 0) {
          alive = true;
          ctx.globalAlpha = Math.max(0, p.a);
          ctx.fillStyle = p.c;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      if (alive) requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, cv.width, cv.height);
    };
    tick();
  }

  const doneCount = challenges.filter((c) => done[c.id]).length;
  const total = challenges.length;
  const alreadyDone = current ? !!done[current.id] : false;

  return (
    <div className="flex flex-1 flex-col">
      {/* Carte roulette */}
      <div
        className="relative mt-4 overflow-hidden rounded-card border p-[22px] pt-[26px] text-center"
        style={{
          borderColor: "var(--line)",
          background:
            "radial-gradient(130% 80% at 50% -10%, var(--champ-tint) 0%, transparent 60%), var(--surface-2)",
        }}
      >
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-[5] h-full w-full" />
        <div
          className="text-[11px] font-bold uppercase"
          style={{ letterSpacing: "0.24em", color: "var(--champ)" }}
        >
          {capturing ? "Ton défi en cours" : "Ton défi"}
        </div>

        {!capturing && (
          <>
            <div className="my-3.5 flex min-h-[96px] items-center justify-center">
              <div
                className="display text-[21px] leading-[1.2] transition-opacity"
                style={{ opacity: spinning ? 0.35 : 1 }}
              >
                {reelText}
              </div>
            </div>
            <button
              className="btn-champ inline-flex items-center gap-2.5 rounded-full px-6 py-[15px] text-[16px] font-bold shadow-soft disabled:opacity-60"
              onClick={spin}
              disabled={spinning}
            >
              🎲 Tourner la roue
            </button>
            {current && !spinning && (
              <button
                className="btn btn-primary mt-2.5 w-full"
                onClick={() => setCapturing(true)}
              >
                {alreadyDone ? "📷 Rejouer ce défi" : "📷 Relever ce défi"}
              </button>
            )}
          </>
        )}

        {capturing && current && (
          <div className="mt-2 text-left">
            <div className="display mb-1 text-center text-[19px] leading-tight">
              {current.label}
            </div>
            <Uploader
              eventId={eventId}
              slug={slug}
              challengeId={current.id}
              onAllDone={onChallengeDone}
            />
            <button
              className="mt-2 w-full py-2 text-center text-[13px] font-semibold"
              style={{ color: "var(--ink-soft)" }}
              onClick={() => setCapturing(false)}
            >
              ‹ Revenir à la roue
            </button>
          </div>
        )}
      </div>

      {/* Progression + liste */}
      {!capturing && (
        <>
          <div className="mb-1.5 mt-5 flex items-center justify-between">
            <div className="eyebrow">Défis relevés</div>
            <div className="text-[13px] tabular-nums" style={{ color: "var(--ink-soft)" }}>
              {doneCount} / {total}
            </div>
          </div>
          <div className="h-[7px] overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
            <span
              className="block h-full rounded-full transition-[width] duration-500"
              style={{ width: total ? `${(doneCount / total) * 100}%` : "0%", background: "var(--sage)" }}
            />
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {challenges.map((c) => {
              const isDone = !!done[c.id];
              const unlocked = isUnlocked(c);
              const remaining = Math.max(0, c.unlock_threshold - regularDone);
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-[13px] border p-[13px]"
                  style={{
                    background: isDone
                      ? "var(--sage-tint)"
                      : unlocked
                        ? "var(--surface-2)"
                        : "var(--surface)",
                    borderColor: isDone ? "var(--sage)" : "var(--line)",
                    opacity: unlocked ? 1 : 0.72,
                  }}
                >
                  <span
                    className="grid h-6 w-6 flex-none place-items-center rounded-full text-[12px]"
                    style={{
                      border: `1.5px solid ${isDone ? "var(--sage)" : "var(--line-strong)"}`,
                      background: isDone ? "var(--sage)" : "transparent",
                      color: isDone ? "var(--on-accent)" : "var(--ink-faint)",
                    }}
                  >
                    {isDone ? "✓" : unlocked ? "" : "🔒"}
                  </span>
                  <div className="flex flex-col">
                    <span
                      className="text-[14px] font-medium"
                      style={{ color: isDone ? "var(--ink-soft)" : "var(--ink)" }}
                    >
                      {c.label}
                    </span>
                    {!unlocked && (
                      <span className="mt-0.5 text-[11.5px]" style={{ color: "var(--champ)" }}>
                        Se débloque après {c.unlock_threshold} défis — encore {remaining}&nbsp;!
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
