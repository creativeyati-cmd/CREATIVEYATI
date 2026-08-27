// Development fallback and migration seed only. Production reads Supabase.
const rows = [
  ["Nothing", "Phone (2a) Launch Microsite", "/img1.png"], ["Apple", "330 P4 Experience Page Concept", "/img2.png"],
  ["Ferrari", "499P Hypercar Configurator", "/img12.jpg"], ["Aesop", "Sensorial Fragrance Story", "/img4.png"],
  ["Polestar", "Polestar 5 Reveal Journey", "/img5.png"], ["Bang & Olufsen", "Beosound Acoustic Lab", "/img6.png"],
  ["Off-White", "FW Lookbook Digital Drop", "/img7.png"], ["Rimowa", "Aluminium Heritage Archive", "/img8.png"],
  ["Loewe", "Craft Maison Editorial", "/img9.png"], ["Hermes", "Petit h Atelier Stories", "/img10.png"],
  ["Balenciaga", "Couture Motion Capsule", "/img11.png"], ["Teenage Engineering", "OP-1 Field Interactive Showcase", "/img3.png"],
];

export const demoVideos = rows.map(([clientName, title, posterUrl], index) => ({
  id: `demo-${index + 1}`, title, slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  shortDescription: title, description: "Demo portfolio content. Replace this project from the admin dashboard.",
  clientName, posterUrl, youtubeUrl: "", youtubeVideoId: "", orientation: index % 3 === 0 ? "portrait" : "landscape",
  aspectRatio: index % 3 === 0 ? 9 / 16 : 16 / 9, status: "published", displayOrder: index, category: null, year: 2026,
}));
