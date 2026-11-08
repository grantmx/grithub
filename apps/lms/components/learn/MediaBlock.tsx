"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { getPlaybackAction } from "@/app/(learn)/actions";
import type { PlaybackGrant } from "@/lib/server/mux";
import { Icon } from "../Icon";
import styles from "./learn.module.css";

// The player script is only downloaded after the learner presses Watch/Listen.
const MuxPlayer = dynamic(() => import("@mux/mux-player-react"), {
  ssr: false,
  loading: () => <p className={styles.mediaNote}>Loading player…</p>,
});

export type MediaBlockProps = {
  contentItemId: string;
  kind: "audio" | "video";
  title: string;
  durationLabel: string | null;
  sizeLabel: string | null;
  /** Tiny signed poster (video only), or null. */
  posterUrl: string | null;
  captionsLanguage: string | null;
};

/**
 * Featured, optional media (design.md: never autoplays; nothing heavy loads
 * until the learner chooses). Shows duration and estimated data size first.
 */
export function MediaBlock(props: MediaBlockProps) {
  const [grant, setGrant] = useState<PlaybackGrant | null>(null);
  const [loading, setLoading] = useState(false);
  const verb = props.kind === "video" ? "Watch" : "Listen";
  const meta = [props.durationLabel, props.sizeLabel]
    .filter(Boolean)
    .join(" · ");

  async function start() {
    setLoading(true);
    try {
      setGrant(await getPlaybackAction(props.contentItemId));
    } catch {
      setGrant({ available: false });
    } finally {
      setLoading(false);
    }
  }

  if (grant?.available) {
    return (
      <div className={styles.media}>
        <MuxPlayer
          playbackId={grant.playbackId}
          tokens={grant.tokens}
          streamType="on-demand"
          audio={props.kind === "audio"}
          autoPlay={false}
          defaultHiddenCaptions={false}
          metadata={{ video_title: props.title }}
          title={props.title}
          accentColor="#3b6680"
          style={{
            width: "100%",
            aspectRatio: props.kind === "video" ? "16 / 9" : undefined,
          }}
        />
      </div>
    );
  }

  return (
    <div className={styles.media}>
      {props.kind === "video" && props.posterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- tiny signed poster (~20 KB)
        <img
          className={styles.mediaPoster}
          src={props.posterUrl}
          alt=""
          loading="lazy"
          width={480}
          height={270}
        />
      ) : null}
      <button
        type="button"
        className={styles.mediaStart}
        onClick={start}
        disabled={loading}
        aria-describedby={`media-${props.contentItemId}`}
      >
        <Icon name={props.kind === "video" ? "play" : "audio"} size={32} />
        <span>
          <span className={styles.mediaLabel}>
            {loading ? "Loading…" : verb}
          </span>
          {meta ? <span className={styles.mediaMeta}> · {meta}</span> : null}
          <span id={`media-${props.contentItemId}`} className={styles.srOnly}>
            {props.title}.{" "}
            {props.kind === "video" && props.captionsLanguage
              ? "Captions available. "
              : ""}
            Optional: the text below covers the same material.
          </span>
        </span>
      </button>
      {grant && !grant.available ? (
        <p className={styles.mediaNote} role="status">
          This {props.kind === "video" ? "video" : "audio"} isn&apos;t available
          right now. Everything you need is in the text below.
        </p>
      ) : null}
    </div>
  );
}
