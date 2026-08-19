import { NextResponse } from "next/server";
import { buildSavingsReport, savingsReportToCsv } from "@/lib/reports";
import { toAppUser, toPolicyDecision, toTeam } from "@/lib/persistence";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format");
  const [teams, users, decisions] = await Promise.all([
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.appUser.findMany({ orderBy: { name: "asc" } }),
    prisma.policyDecision.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  const report = buildSavingsReport({
    teams: teams.map(toTeam),
    users: users.map(toAppUser),
    decisions: decisions.map(toPolicyDecision),
  });

  if (format === "csv") {
    return new Response(savingsReportToCsv(report), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ai-model-router-savings-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json(report);
}
