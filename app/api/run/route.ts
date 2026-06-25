import { z } from "zod";
import { NextResponse } from "next/server";
import { buildDriver, languageIds, runOnJudge0 } from "@/lib/judge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const runSchema = z.object({
  language: z.string(),
  code: z.string().max(50000),
  functionName: z.string(),
  args: z.array(z.unknown()),
  params: z
    .array(z.object({ name: z.string(), type: z.string() }))
    .optional(),
});

const runRateLimit = new Map<string, number[]>();

function getIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function checkRunRateLimit(ip: string): boolean {
  const now = Date.now();
  const window = 60_000;
  const limit = 20;
  const timestamps = (runRateLimit.get(ip) ?? []).filter((t) => now - t < window);
  if (timestamps.length >= limit) return false;
  timestamps.push(now);
  runRateLimit.set(ip, timestamps);
  return true;
}

export async function POST(request: Request) {
  const ip = getIp(request);
  if (!checkRunRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429 }
    );
  }

  const payload = await request.json();
  const result = runSchema.safeParse(payload);

  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid run payload", issues: result.error.flatten() },
      { status: 400 }
    );
  }

  const { language, code, functionName, args, params } = result.data;
  const languageId = languageIds[language];

  if (!languageId) {
    return NextResponse.json(
      { error: `Unsupported language: ${language}` },
      { status: 400 }
    );
  }

  const { code: fullCode, stdin } = buildDriver(
    language,
    code,
    functionName,
    args,
    params
  );

  const { data, error } = await runOnJudge0(fullCode, languageId, stdin);

  if (error || !data) {
    console.error("[run] judge0 error:", error);
    return NextResponse.json(
      { error: `Judge service error: ${error ?? "unknown error"}` },
      { status: 502 }
    );
  }

  return NextResponse.json({
    stdout: data.stdout ?? "",
    stderr: data.stderr ?? data.compile_output ?? data.message ?? "",
    statusId: data.status?.id ?? null,
    statusDescription: data.status?.description ?? null,
    exitCode: data.status?.id === 3 ? 0 : 1,
  });
}
