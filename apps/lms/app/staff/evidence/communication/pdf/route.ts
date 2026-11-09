import { commsLogResponse } from "../export";

/** GET /staff/evidence/communication/pdf?cohort=&from=&to= */
export async function GET(req: Request): Promise<Response> {
  return commsLogResponse(req, "pdf");
}
