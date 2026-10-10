export function isR2Video(key) { return typeof key === "string" && /^[a-f0-9-]{36}\/r2\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.mp4$/i.test(key); }
