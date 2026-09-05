"use client";

import Image from "next/image";
import { useState } from "react";

export default function ProfileAvatar({ src, alt, initials, className = "profile-image", width = 40, height = 40, sizes, style, priority = false }) {
  const [failedSrc, setFailedSrc] = useState("");

  if (!src || failedSrc === src) return <span className={`${className} identity-mark profile-avatar-fallback`} aria-label={alt}>{initials}</span>;
  return <Image className={className} src={src} width={width} height={height} sizes={sizes} style={style} alt={alt} priority={priority} unoptimized={src.includes("drive.google.com/thumbnail")} onError={() => setFailedSrc(src)} />;
}
