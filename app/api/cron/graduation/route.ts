import { NextRequest, NextResponse, connection } from "next/server";
import { runGraduationPipeline } from "@/lib/graduation-service";
import { env } from "@/env";

export const maxDuration = 120; // LP creation can take time (pool deploy + confirmation)

export async function GET(req: NextRequest) {
    await connection();

    if (!env.CRON_SECRET) {
        return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    if (req.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const report = await runGraduationPipeline();

        const hasWork =
            report.detected.length > 0 ||
            report.opSent.length > 0 ||
            report.lpCreated.length > 0;

        return NextResponse.json(
            {
                message: hasWork ? "Graduation pipeline processed" : "No pending graduations",
                detected: report.detected,
                opSent: report.opSent,
                lpCreated: report.lpCreated,
                errors: report.errors,
            },
            { status: 200 },
        );
    } catch (error) {
        console.error("[graduation cron] Pipeline failed:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Pipeline failed" },
            { status: 500 },
        );
    }
}
