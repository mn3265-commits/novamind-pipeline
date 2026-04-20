import { NextResponse } from "next/server";
import { db } from "@/lib/db/store";
import { getRequestLog } from "@/lib/crm/hubspot-mock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const campaigns = db.listCampaigns();
  const metrics = db.listMetrics();
  const runs = db.listRuns();
  const insights = db.listInsights();
  const contentPackages = db.listContentPackages();
  const crmRequestLog = getRequestLog();

  return NextResponse.json({
    campaigns,
    metrics,
    runs,
    insights,
    contentPackages,
    crmRequestLog,
  });
}
