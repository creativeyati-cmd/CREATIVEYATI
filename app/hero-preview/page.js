import Link from "next/link";

// Design preview of a new studio hero. Deliberately a standalone route: the live
// home page is untouched until this is approved. noindex, and not linked anywhere.

export const metadata = { title: "Hero preview", robots: { index: false, follow: false } };

// fill src with real stills and the cards use them; empty falls back to a wash,
// so the composition can be judged before the imagery exists. e.g.
// { src: "/media/still-01.jpg", alt: "Beauty commercial" }
const CARDS = [
  { src: "", alt: "" }, { src: "", alt: "" }, { src: "", alt: "" }, { src: "", alt: "" },
  { src: "", alt: "" }, { src: "", alt: "" }, { src: "", alt: "" },
];

const WASHES = [
  "linear-gradient(170deg, #cdc7bd 0%, #8f877c 100%)",
  "linear-gradient(170deg, #d7d2c8 0%, #a49c90 100%)",
  "linear-gradient(170deg, #c6c9c4 0%, #878d86 100%)",
  "linear-gradient(170deg, #d9d4cc 0%, #9c948a 100%)",
  "linear-gradient(170deg, #c9c4bb 0%, #8b8478 100%)",
  "linear-gradient(170deg, #d3cec5 0%, #9d968a 100%)",
  "linear-gradient(170deg, #c4bfb6 0%, #857f75 100%)",
];

const CENTRE = (CARDS.length - 1) / 2;

export default function HeroPreviewPage() {
  return <div className="lh-page">
    <header className="lh-nav">
      <span className="lh-brand">
        <span className="lh-mark" aria-hidden="true" />
        <span className="lh-brand-name">Idayat</span>
      </span>
      <nav className="lh-links" aria-label="Primary">
        <Link href="/work">Work</Link>
        <Link href="/services">Services</Link>
        <Link href="/academy">Academy</Link>
        <Link href="/about">About</Link>
        <Link href="/contact">Contact</Link>
      </nav>
      <Link className="lh-nav-cta" href="/contact">Start a project</Link>
    </header>

    <section className="lh-hero">
      <p className="lh-badge">Films, ads and product stories</p>
      <h1 className="lh-headline">
        We make commercials<br />
        people actually watch
      </h1>
      <p className="lh-lede">
        A small studio for brands that want work people finish. Concept, direction and edit handled end to end, from the first brief to the final cut.
      </p>
      <div className="lh-actions">
        <Link className="lh-btn lh-btn-primary" href="/contact">Start a project</Link>
        <Link className="lh-btn lh-btn-secondary" href="/work">See the work</Link>
      </div>
    </section>

    {/* deliberately wider than the viewport, and clipped at the bottom, so the
        row reads as emerging from the edge rather than sitting in a box */}
    <section className="lh-gallery" aria-hidden="true">
      <div className="lh-fan">
        {CARDS.map((card, index) => {
          const distance = Math.abs(index - CENTRE);
          return <figure
            className="lh-card"
            key={index}
            style={{
              width: `${176 + distance * 28}px`,
              height: `${268 + distance * 48}px`,
              marginTop: `${distance * 18}px`,
              borderRadius: `${26 + distance * 3}px`,
              transform: `rotate(${(index - CENTRE) * 1.35}deg)`,
              zIndex: 20 - Math.round(distance),
              background: card.src ? undefined : WASHES[index % WASHES.length],
            }}
          >
            {card.src ? <img src={card.src} alt={card.alt} loading={index > 3 ? "lazy" : "eager"} /> : null}
          </figure>;
        })}
      </div>
    </section>
  </div>;
}
