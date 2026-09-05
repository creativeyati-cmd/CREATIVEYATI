import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const siteDefaults = {
  creatorName: "Frame / Motion", profileImage: "", profileImageStorageKey: "", profileFocalX: 50, profileFocalY: 50, heroHeading: "I turn brand ideas into stories people want to watch.", highlightWord: "stories",
  heroCopy: "From concept to final cut, I create compelling visual content that captures attention and brings brands to life.", ctaLabel: "Get in touch", ctaHref: "#contact",
  aboutHeading: "Made for attention, built with intent.", aboutCopy: "I shape films and moving images for brands with something worth saying. Available for commercial, cultural and collaborative work.",
  professionalTitle: "Director · Video Creator · Visual Storyteller", availability: "Available for selected projects",
  aboutCurrentWork: "I’m a video creator and visual storyteller helping brands turn ideas into films people genuinely want to watch. I work across concept development, production and post-production, creating visual content that feels intentional from the first frame to the final cut.",
  aboutApproach: "My work sits between strategy and storytelling. I’m interested in more than producing attractive visuals—I want every scene, transition and sound choice to strengthen the message and hold the audience’s attention.",
  aboutExperience: "I’ve worked across brand campaigns, commercial content, social films and short-form storytelling, collaborating with teams and independent brands to bring ideas from early direction to finished production.",
  aboutPhilosophy: "I believe the best visual work feels clear before it feels complicated. Strong ideas, thoughtful direction and disciplined editing will always matter more than effects added without purpose.",
  contactHeading: "Have a story in mind?", contactCopy: "Tell me what you’re making, what you need, and where you want it to go.", publicEmail: "", phone: "", bookingUrl: "https://cal.com/yati-creative-dyfafh/30min", instagramUrl: "", youtubeUrl: "", footerText: "",
  accentColor: "#a3c900", lightBackground: "#ffffff",
};

export async function getSiteContent() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return siteDefaults;
  const [{ data }, { data: contact }, { data: legacyContact }] = await Promise.all([
    supabase.from("site_content").select("value").eq("key", "site").maybeSingle(),
    supabase.from("site_content").select("value").eq("key", "setting:contact").maybeSingle(),
    supabase.from("site_settings").select("value").eq("key", "contact").maybeSingle(),
  ]);
  return { ...siteDefaults, ...(data?.value || {}), ...(legacyContact?.value || {}), ...(contact?.value || {}) };
}
