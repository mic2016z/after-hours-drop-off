import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

const FIVE_YEARS_MS = 5 * 365 * 24 * 60 * 60 * 1000;

function normalizePlate(value: string): string {
  return value.trim().toUpperCase();
}

function requireStaffToken(staffToken: string) {
  const expected = process.env.STAFF_ADMIN_TOKEN;
  if (!expected) {
    throw new Error("STAFF_ADMIN_TOKEN is not configured");
  }
  if (staffToken !== expected) {
    throw new Error("Unauthorized");
  }
}

export const createBookingToken = mutation({
  args: {
    staffToken: v.string(),
    bookingRef: v.string(),
    licensePlate: v.string(),
    validForDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    requireStaffToken(args.staffToken);

    const validDays = Math.max(1, Math.min(args.validForDays ?? 2, 30));
    const now = Date.now();
    const expiresAt = now + validDays * 24 * 60 * 60 * 1000;
    const token = `${crypto.randomUUID()}-${crypto.randomUUID()}`;

    const id = await ctx.db.insert("bookingTokens", {
      token,
      bookingRef: args.bookingRef.trim(),
      licensePlate: normalizePlate(args.licensePlate),
      createdAt: now,
      expiresAt,
    });

    return {
      id,
      token,
      expiresAt,
    };
  },
});

export const revokeBookingToken = mutation({
  args: { staffToken: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    requireStaffToken(args.staffToken);

    const tokenDoc = await ctx.db
      .query("bookingTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!tokenDoc) {
      throw new Error("Token not found");
    }

    await ctx.db.patch(tokenDoc._id, { revokedAt: Date.now() });
  },
});

export const listBookingTokens = query({
  args: { staffToken: v.string() },
  handler: async (ctx, args) => {
    requireStaffToken(args.staffToken);

    return await ctx.db
      .query("bookingTokens")
      .order("desc")
      .take(50);
  },
});

export const generateUploadUrl = mutation({
  args: {
    bookingToken: v.string(),
    licensePlate: v.string(),
  },
  handler: async (ctx, args) => {
    const tokenDoc = await ctx.db
      .query("bookingTokens")
      .withIndex("by_token", (q) => q.eq("token", args.bookingToken))
      .first();

    if (!tokenDoc) {
      throw new Error("Invalid booking token");
    }

    if (tokenDoc.revokedAt) {
      throw new Error("Booking token has been revoked");
    }

    if (tokenDoc.expiresAt < Date.now()) {
      throw new Error("Booking token has expired");
    }

    const normalized = normalizePlate(args.licensePlate);
    if (normalized !== tokenDoc.licensePlate) {
      throw new Error("License plate does not match booking token");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

export const saveReport = mutation({
  args: {
    bookingToken: v.string(),
    licensePlate: v.string(),
    lat: v.number(),
    lng: v.number(),
    image1StorageId: v.id("_storage"),
    image2StorageId: v.id("_storage"),
    image3StorageId: v.id("_storage"),
    image4StorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const tokenDoc = await ctx.db
      .query("bookingTokens")
      .withIndex("by_token", (q) => q.eq("token", args.bookingToken))
      .first();

    if (!tokenDoc) {
      throw new Error("Invalid booking token");
    }

    if (tokenDoc.revokedAt) {
      throw new Error("Booking token has been revoked");
    }

    if (tokenDoc.expiresAt < Date.now()) {
      throw new Error("Booking token has expired");
    }

    const normalizedPlate = normalizePlate(args.licensePlate);
    if (normalizedPlate !== tokenDoc.licensePlate) {
      throw new Error("License plate does not match booking token");
    }

    await ctx.db.insert("reports", {
      bookingTokenId: tokenDoc._id,
      bookingRef: tokenDoc.bookingRef,
      licensePlate: normalizedPlate,
      createdAt: Date.now(),
      lat: args.lat,
      lng: args.lng,
      image1StorageId: args.image1StorageId,
      image2StorageId: args.image2StorageId,
      image3StorageId: args.image3StorageId,
      image4StorageId: args.image4StorageId,
    });
  },
});

export const getReports = query({
  args: { staffToken: v.string() },
  handler: async (ctx, args) => {
    requireStaffToken(args.staffToken);

    return await ctx.db
      .query("reports")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();
  },
});

export const purgeOldReports = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - FIVE_YEARS_MS;
    const oldReports = await ctx.db
      .query("reports")
      .withIndex("by_createdAt", (q) => q.lt("createdAt", cutoff))
      .collect();

    for (const report of oldReports) {
      await Promise.all([
        ctx.storage.delete(report.image1StorageId),
        ctx.storage.delete(report.image2StorageId),
        ctx.storage.delete(report.image3StorageId),
        ctx.storage.delete(report.image4StorageId),
      ]);
      await ctx.db.delete(report._id);
    }

    const oldTokens = await ctx.db
      .query("bookingTokens")
      .withIndex("by_expiresAt", (q) => q.lt("expiresAt", cutoff))
      .collect();

    for (const token of oldTokens) {
      await ctx.db.delete(token._id);
    }

    return { deletedReports: oldReports.length, deletedTokens: oldTokens.length };
  },
});
