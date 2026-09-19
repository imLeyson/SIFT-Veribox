import { NextResponse } from "next/server";
import { agentInfo } from "@/lib/agent/convergence";
export async function GET() {
  return NextResponse.json(agentInfo());
}
