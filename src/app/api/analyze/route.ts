import { NextResponse } from "next/server";
import { generateInsightReport } from "@/lib/ai/insight-engine";
import { db } from "@/lib/db/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { contentPackageId } = await req.json();
    if (!contentPackageId) {
      return NextResponse.json(
        { error: "contentPackageId is required" },
        { status: 400 }
      );
    }

    const pkg = db.getContentPackage(contentPackageId);
    if (!pkg) {
      return NextResponse.json(
        { error: "content package not found" },
        { status: 404 }
      );
    }

    const campaigns = db.campaignsForPackage(contentPackageId);
    const metrics = campaigns
      .map((c) => db.metricsForCampaign(c.id))
      .filter((m): m is NonNullable<typeof m> => !!m);

    if (metrics.length === 0) {
      return NextResponse.json(
        { error: "no metrics found for this package" },
        { status: 400 }
      );
    }

    const insight = await generateInsightReport(
      contentPackageId,
      pkg.topic,
      metrics,
      db.listContacts()
    );
    db.saveInsight(insight);
    return NextResponse.json(insight);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ insights: db.listInsights() });
}
