// GET /api/health — liveness check for uptime monitors and deploy checks.
// Exposes no configuration, secrets or dependency details.
export const dynamic = "force-dynamic";

export type HealthResponse = {
  status: "ok";
  service: "lms";
  time: string;
};

export function GET(): Response {
  const body: HealthResponse = {
    status: "ok",
    service: "lms",
    time: new Date().toISOString(),
  };

  return Response.json(body, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
