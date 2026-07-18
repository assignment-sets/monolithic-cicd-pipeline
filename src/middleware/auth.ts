// src/middleware/auth.ts

import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

export type AppRouteHandler<Params = any> = (
  req: Request,
  ctx: { params: Promise<Params> }
) => Promise<Response>;

export function requireAuth<Params = any>(
  handler: AppRouteHandler<Params>
): AppRouteHandler<Params> {
  return async (req, ctx) => {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return handler(req, ctx);
  };
}
