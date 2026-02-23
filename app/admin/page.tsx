"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? "";

function imageUrl(storageId: Id<"_storage">, staffToken: string): string {
  if (!CONVEX_SITE_URL || !staffToken) return "";
  const url = new URL("/getImage", CONVEX_SITE_URL);
  url.searchParams.set("storageId", storageId);
  url.searchParams.set("staffToken", staffToken);
  return url.href;
}

function mapLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleString();
}

const IMAGE_LABELS = ["Front", "Back", "Left", "Right"];

export default function AdminPage() {
  const [staffToken, setStaffToken] = useState("");
  const [bookingRef, setBookingRef] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [validForDays, setValidForDays] = useState(2);
  const [newToken, setNewToken] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const createBookingToken = useMutation(api.reports.createBookingToken);
  const revokeBookingToken = useMutation(api.reports.revokeBookingToken);

  const authToken = useMemo(() => staffToken.trim(), [staffToken]);

  const reports = useQuery(
    api.reports.getReports,
    authToken ? { staffToken: authToken } : "skip"
  );

  const bookingTokens = useQuery(
    api.reports.listBookingTokens,
    authToken ? { staffToken: authToken } : "skip"
  );

  const handleCreateToken = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setNewToken("");

    if (!authToken) {
      setError("Enter staff token first");
      return;
    }

    try {
      const result = await createBookingToken({
        staffToken: authToken,
        bookingRef: bookingRef.trim(),
        licensePlate: licensePlate.trim(),
        validForDays,
      });
      setNewToken(result.token);
      setSuccess("Booking token created");
      setBookingRef("");
      setLicensePlate("");
      setValidForDays(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create token");
    }
  };

  const handleRevoke = async (token: string) => {
    setError("");
    setSuccess("");
    if (!authToken) {
      setError("Enter staff token first");
      return;
    }

    try {
      await revokeBookingToken({ staffToken: authToken, token });
      setSuccess("Token revoked");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke token");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        <header className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight">Staff Admin Panel</h1>
          <p className="text-sm text-zinc-400">
            Staff-only evidence dashboard. Enter your staff token to view reports and manage booking tokens.
          </p>
          <input
            value={staffToken}
            onChange={(e) => setStaffToken(e.target.value)}
            type="password"
            placeholder="Staff admin token"
            className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
          />
        </header>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            {success}
          </div>
        )}

        {!authToken ? (
          <p className="text-zinc-400">Enter staff token to continue.</p>
        ) : (
          <>
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-lg">
              <h2 className="mb-4 text-lg font-semibold">Issue Booking Token</h2>
              <form onSubmit={handleCreateToken} className="grid gap-3 md:grid-cols-4">
                <input
                  value={bookingRef}
                  onChange={(e) => setBookingRef(e.target.value)}
                  placeholder="Booking reference"
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                  required
                />
                <input
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  placeholder="License plate"
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                  required
                />
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={validForDays}
                  onChange={(e) => setValidForDays(Number(e.target.value) || 2)}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-emerald-400"
                >
                  Create Token
                </button>
              </form>
              {newToken && (
                <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900 p-3">
                  <p className="text-xs text-zinc-400 mb-1">Share this token with customer:</p>
                  <p className="font-mono text-xs break-all text-emerald-300">{newToken}</p>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-lg">
              <h2 className="mb-4 text-lg font-semibold">Recent Booking Tokens</h2>
              {bookingTokens === undefined ? (
                <p className="text-zinc-400">Loading tokens...</p>
              ) : bookingTokens.length === 0 ? (
                <p className="text-zinc-400">No tokens issued yet.</p>
              ) : (
                <ul className="space-y-2">
                  {bookingTokens.map((tokenDoc) => (
                    <li key={tokenDoc._id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-1 text-xs">
                          <p className="font-mono text-emerald-300 break-all">{tokenDoc.token}</p>
                          <p className="text-zinc-400">
                            Booking {tokenDoc.bookingRef} | Plate {tokenDoc.licensePlate} | Expires {formatTime(tokenDoc.expiresAt)}
                          </p>
                        </div>
                        {!tokenDoc.revokedAt ? (
                          <button
                            onClick={() => handleRevoke(tokenDoc.token)}
                            className="rounded-md border border-red-500/40 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                          >
                            Revoke
                          </button>
                        ) : (
                          <span className="text-xs text-zinc-500">Revoked</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="mb-4 text-xl font-semibold tracking-tight">Drop-off reports</h2>
              {reports === undefined ? (
                <p className="text-zinc-400">Loading reports...</p>
              ) : reports.length === 0 ? (
                <p className="text-zinc-400">No reports yet.</p>
              ) : (
                <ul className="space-y-6">
                  {reports.map((report) => (
                    <li
                      key={report._id}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-lg"
                    >
                      <div className="mb-3 flex flex-wrap items-center gap-3 border-b border-zinc-800 pb-3">
                        <span className="font-mono text-lg font-semibold text-emerald-400">
                          {report.licensePlate}
                        </span>
                        <span className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300">
                          {report.bookingRef}
                        </span>
                        <span className="text-sm text-zinc-500">{formatTime(report.createdAt)}</span>
                        <a
                          href={mapLink(report.lat ?? 0, report.lng ?? 0)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-emerald-400 hover:underline"
                        >
                          View on map
                        </a>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {IMAGE_LABELS.map((label, i) => {
                          const storageId = [
                            report.image1StorageId,
                            report.image2StorageId,
                            report.image3StorageId,
                            report.image4StorageId,
                          ][i];
                          const src = imageUrl(storageId, authToken);
                          return (
                            <div key={i} className="space-y-1">
                              <p className="text-xs font-medium text-zinc-500">{label}</p>
                              {src ? (
                                <a
                                  href={src}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800"
                                >
                                  <img
                                    src={src}
                                    alt={label}
                                    className="h-28 w-full object-cover"
                                  />
                                </a>
                              ) : (
                                <div className="flex h-28 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-xs text-zinc-500">
                                  Set NEXT_PUBLIC_CONVEX_SITE_URL
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

