"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getVideoSource } from "@/lib/video-source";
import { SoundIcon } from "./Icons";

export default function ExternalVideoPlayer({ video, onClose }) {
  const frame = useRef(null);
  const [failed, setFailed] = useState(false);
  const [muted, setMuted] = useState(true);
  const source = useMemo(() => {
    if (video?.videoProvider && video?.videoEmbedUrl) return {
      provider: video.videoProvider,
      assetId: video.videoAssetId,
      embedUrl: video.videoEmbedUrl,
    };
    return getVideoSource(video?.videoUrl || video?.youtubeUrl || "");
  }, [video]);

  useEffect(() => () => { if (frame.current) frame.current.src = "about:blank"; }, []);

  function sendPlayerCommand(command, args = []) {
    if (source?.provider !== "youtube") return;
    frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func: command, args }), "*");
  }

  function toggleSound() {
    if (muted) {
      sendPlayerCommand("setVolume", [100]);
      sendPlayerCommand("unMute");
      sendPlayerCommand("playVideo");
    } else {
      sendPlayerCommand("mute");
    }
    setMuted((current) => !current);
  }

  if (!source?.embedUrl) return <div className="player-empty">A playable video link has not been attached to this project.</div>;
  return <section className={`player ${video.orientation === "portrait" ? "player-portrait" : ""}`} data-orientation={video.orientation === "portrait" ? "portrait" : "landscape"} data-ratio={video.orientation === "portrait" ? "9:16" : "16:9"} aria-label={`${video.title} video`}>
    <iframe ref={frame} src={source.embedUrl} title={video.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen onError={() => setFailed(true)} />
    {failed && <p className="player-error">This video is unavailable, private, or cannot be embedded.</p>}
    <div className="player-actions">
      {source.provider === "youtube" && <button className="player-sound" type="button" onClick={toggleSound} aria-pressed={!muted}>
        <SoundIcon muted={muted} />
        {muted ? "Turn sound on" : "Mute"}
      </button>}
      {onClose && <button className="player-close" type="button" onClick={onClose}>Close project</button>}
    </div>
  </section>;
}
