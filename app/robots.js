export default function robots() {
  const disallow = ["/admin", "/learn", "/api/", "/auth/", "/checkout/", "/payment/", "/q/", "/design-review", "/reset-password", "/verify-email"];
  return { rules: [{userAgent:"*",allow:"/",disallow},{userAgent:"OAI-SearchBot",allow:"/",disallow}], sitemap:"https://aivideocreator.cv/sitemap.xml" };
}
