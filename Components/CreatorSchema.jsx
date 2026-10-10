const origin = "https://aivideocreator.cv";
const data = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Person", "@id": `${origin}/#idayat-ibrahim`, name: "Idayat Ibrahim", url: `${origin}/about`, jobTitle: "AI Video Creator, AI Video Editor and AI Tutor", description: "AI Video Creator, AI Video Editor, Visual Storyteller and AI Tutor based in Nigeria. Creates AI commercials, UGC-style content, product ads and branded films, and teaches AI video production.", homeLocation: { "@type": "Country", name: "Nigeria" }, worksFor: { "@id": `${origin}/#studio` }, knowsAbout: ["AI Video Creation", "AI Video Editing", "AI Commercials", "AI UGC", "Product Video Advertising", "AI Filmmaking", "Prompting", "Visual Storytelling", "AI Image Generation", "AI Video Training"] },
    { "@type": "ProfessionalService", "@id": `${origin}/#studio`, name: "Idayat Ibrahim Studio", url: origin, founder: { "@id": `${origin}/#idayat-ibrahim` }, areaServed: [{ "@type": "Country", name: "Nigeria" }, { "@type": "Place", name: "Worldwide" }], description: "AI video creation, video editing, commercial production and visual storytelling for brands and businesses." },
  ],
};
export default function CreatorSchema() {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(data).replace(/</g,"\\u003c")}} />;
}
