import { handleTurn } from "@/lib/agent/convergence-api";
export const maxDuration = 60;
export async function POST(request: Request) {
  return handleTurn(request, true);
}
