"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import styles from "../learn/learn.module.css";

/**
 * Display-only countdown (the server enforces the deadline). Hideable
 * (design-gate decision 2026-11-08); it reappears and is announced politely
 * at 10, 5 and 1 minutes left. At zero the page reloads, and the server
 * submits the saved answers.
 */
const WARN_AT = [10, 5, 1];
const HIDE_KEY = "lms.timer.hidden";

function fmt(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

export function AttemptTimer({
  deadlineAt,
  serverNow,
  paused,
}: {
  deadlineAt: string;
  serverNow: string;
  paused: boolean;
}) {
  // Correct for a wrong device clock using the server's time at render.
  const [offset] = useState(() => new Date(serverNow).getTime() - Date.now());
  const deadline = new Date(deadlineAt).getTime();
  // First render uses the server's clock, so server and browser render the same.
  const [left, setLeft] = useState(deadline - new Date(serverNow).getTime());
  const [hidden, setHidden] = useState(false);
  const [announce, setAnnounce] = useState("");
  const warned = useRef(new Set<number>());

  // Restore the learner's hide preference after hydration (server renders it visible).
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        setHidden(window.localStorage.getItem(HIDE_KEY) === "1");
      } catch {
        /* storage unavailable: show the timer */
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (paused) return;
    const tick = () => {
      const ms = deadline - (Date.now() + offset);
      setLeft(ms);
      for (const m of WARN_AT) {
        if (ms <= m * 60_000 && ms > (m - 1) * 60_000 && !warned.current.has(m)) {
          warned.current.add(m);
          setHidden(false);
          setAnnounce(`${m} minute${m === 1 ? "" : "s"} left`);
        }
      }
      if (ms <= 0) window.location.reload();
    };
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [deadline, offset, paused]);

  const toggle = () => {
    const next = !hidden;
    setHidden(next);
    try {
      window.localStorage.setItem(HIDE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  const low = left <= 5 * 60_000;
  return (
    <>
      <button
        type="button"
        className={`${styles.timer} ${low ? styles.timerLow : ""}`}
        onClick={toggle}
        aria-label={hidden ? "Show time left" : `Time left ${fmt(left)}. Hide timer`}
      >
        <Icon name={paused ? "pause" : hidden ? "hide" : "timer"} />
        {paused ? "Paused" : hidden ? "Show time" : fmt(left)}
      </button>
      <span className={styles.srOnly} aria-live="polite">
        {announce}
      </span>
    </>
  );
}
