import { saveWorkspace } from "@/app/admin/course-workspace-actions";
export async function POST(request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return Response.json({ ok: false, error: "Invalid request origin." }, { status: 403 });
  if (!request.headers.get("content-type")?.includes("application/json"))
    return Response.json({ ok: false, error: "JSON required." }, { status: 415 });
  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ ok: false, error: "Invalid draft request." }, { status: 400 });
  const result = await saveWorkspace(body.id, body.revision, body.document);
  return Response.json(result, { status: result.ok ? 200 : result.conflict ? 409 : 400 });
}
