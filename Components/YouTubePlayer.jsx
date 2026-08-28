"use client";

import { useEffect, useRef, useState } from "react";
import { embedUrl } from "@/lib/youtube";
import { SoundIcon } from "./Icons";

export default function YouTubePlayer({ video, onClose }) {
  const frame = useRef(null);
  const [failed, setFailed] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => () => { if (frame.current) frame.current.src = "about:blank"; }, []);

  const sendPlayerCommand = (command, args = []) => {
    frame.current?.contentWindow?.postMessage(JSON.stringify({
      event: "command",
      func: command,
      args,
    }), "*");
  };

  const toggleSound = () => {
    if (muted) {
      sendPlayerCommand("setVolume", [100]);
      sendPlayerCommand("unMute");
      sendPlayerCommand("playVideo");
    } else {
      sendPlayerCommand("mute");
    }
    setMuted((current) => !current);
  };

  if (!video?.youtubeVideoId) return <div className="player-empty">A YouTube video has not been attached to this demo project.</div>;
  return <section className={`player ${video.orientation === "portrait" ? "player-portrait" : ""}`} data-orientation={video.orientation === "portrait" ? "portrait" : "landscape"} data-ratio={video.orientation === "portrait" ? "9:16" : "16:9"} aria-label={`${video.title} video`}>
    <iframe ref={frame} src={embedUrl(video.youtubeVideoId)} title={video.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen onError={() => setFailed(true)} />
    {failed && <p className="player-error">This video is unavailable or cannot be embedded.</p>}
    <div className="player-actions">
      <button className="player-sound" type="button" onClick={toggleSound} aria-pressed={!muted}>
        <SoundIcon muted={muted} />
        {muted ? "Turn sound on" : "Mute"}
      </button>
      {onClose && <button className="player-close" type="button" onClick={onClose}>Close project</button>}
    </div>
  </section>;
}
