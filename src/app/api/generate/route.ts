import { NextResponse } from "next/server";
import { generateContentPackage } from "@/lib/ai/content-generator";
import { db } from "@/lib/db/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { topic } = await req.json();
    if (!topic) {
      return NextResponse.json({ error: "topic is required" }, { status: 400 });
    }
    const pkg = await generateContentPackage(topic);
    db.saveContentPackage(pkg);
    return NextResponse.json(pkg);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ contentPackages: db.listContentPackages() });
}
