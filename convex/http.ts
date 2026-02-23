import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const http = httpRouter();

function requireStaffToken(staffToken: string | null) {
  const expected = process.env.STAFF_ADMIN_TOKEN;
  if (!expected) {
    throw new Error("STAFF_ADMIN_TOKEN is not configured");
  }
  if (!staffToken || staffToken !== expected) {
    return false;
  }
  return true;
}

http.route({
  path: "/getImage",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const { searchParams } = new URL(request.url);
    const storageId = searchParams.get("storageId") as Id<"_storage"> | null;
    const staffToken = searchParams.get("staffToken");

    if (!requireStaffToken(staffToken)) {
      return new Response("Unauthorized", { status: 401 });
    }

    if (!storageId) {
      return new Response("Missing storageId", { status: 400 });
    }

    const blob = await ctx.storage.get(storageId);
    if (blob === null) {
      return new Response("Image not found", { status: 404 });
    }

    return new Response(blob, {
      headers: {
        "Content-Type": blob.type || "image/jpeg",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }),
});

export default http;
