import { commsLogResponse } from "../export";

/** GET /staff/evidence/communication/csv?cohort=&from=&to= */
export async function GET(req: Request): Promise<Response> {
  return commsLogResponse(req, "csv");
}
