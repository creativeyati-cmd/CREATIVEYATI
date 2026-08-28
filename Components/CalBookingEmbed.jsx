"use client";

import { useEffect, useMemo } from "react";
import Cal, { getCalApi } from "@calcom/embed-react";

const namespace = "portfolio-booking";

function bookingPath(bookingUrl) {
  try {
    const url = new URL(bookingUrl);
    return url.pathname.replace(/^\/+|\/+$/g, "");
  } catch {
    return String(bookingUrl || "").replace(/^https?:\/\/cal\.com\//, "").replace(/^\/+|\/+$/g, "");
  }
}

export default function CalBookingEmbed({ bookingUrl }) {
  const calLink = useMemo(() => bookingPath(bookingUrl), [bookingUrl]);

  useEffect(() => {
    if (!calLink) return;
    let cancelled = false;
    getCalApi({ namespace }).then((cal) => {
      if (cancelled) return;
      cal("ui", {
        theme: "auto",
        styles: { branding: { brandColor: "#9BC300" } },
        hideEventTypeDetails: false,
        layout: "month_view",
      });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [calLink]);

  if (!calLink) return null;

  return <section className="booking-section" aria-labelledby="booking-heading">
    <p className="eyebrow">AVAILABILITY</p>
    <h2 id="booking-heading">Book a call</h2>
    <p>Choose an available date and time below. Your booking will be confirmed without leaving the portfolio.</p>
    <div className="booking-embed">
      <Cal
        namespace={namespace}
        calLink={calLink}
        config={{ layout: "month_view", "ui.color-scheme": "auto" }}
        style={{ width: "100%", minHeight: "680px", overflow: "hidden" }}
      />
    </div>
    <p className="booking-fallback"><a className="inline-link" href={bookingUrl} target="_blank" rel="noreferrer">Open booking calendar in a new tab</a></p>
  </section>;
}
