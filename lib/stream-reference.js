// Keep uploaded videos compatible with existing course workspaces and history.
export function streamVideoId(key) {
  return String(key || "").match(/^[a-f0-9-]{36}\/[A-Za-z0-9_-]+\/([a-f0-9]{32})\.stream$/i)?.[1] || "";
}
