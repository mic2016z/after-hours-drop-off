import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  bookingTokens: defineTable({
    token: v.string(),
    bookingRef: v.string(),
    licensePlate: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    revokedAt: v.optional(v.number()),
  })
    .index("by_token", ["token"])
    .index("by_expiresAt", ["expiresAt"]),

  reports: defineTable({
    bookingTokenId: v.optional(v.id("bookingTokens")),
    bookingRef: v.optional(v.string()),
    licensePlate: v.string(),
    createdAt: v.number(),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    image1StorageId: v.id("_storage"),
    image2StorageId: v.id("_storage"),
    image3StorageId: v.id("_storage"),
    image4StorageId: v.id("_storage"),
  }).index("by_createdAt", ["createdAt"]),
});
