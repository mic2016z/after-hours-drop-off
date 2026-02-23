"use client";

import Link from "next/link";
import { useState, useRef, FormEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

async function uploadFile(
  file: File,
  generateUploadUrl: () => Promise<string>
): Promise<Id<"_storage">> {
  const url = await generateUploadUrl();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    throw new Error(`Upload failed: ${errorText}`);
  }
  const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
  return storageId;
}

function getPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

const LABELS = ["Front", "Back", "Left", "Right"];

const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
);

const customerSteps = [
  "Scan the QR code on the after-hours lockbox.",
  "Enter your booking token and vehicle license plate.",
  "Take 4 required photos: front, back, left, and right.",
  "Enable location when prompted and submit the report.",
  "You will see a success message confirming the return record.",
];

const adminSteps = [
  "Open the admin panel at /admin.",
  "Sign in with the staff admin token.",
  "Find the latest drop-off report by plate and timestamp.",
  "Open map link and photos to verify handover condition.",
  "Use the record as your evidence pack for disputes, insurer claims, and chargebacks.",
];

export default function Home() {
  const [bookingToken, setBookingToken] = useState("");
  const [plate, setPlate] = useState("");
  const [files, setFiles] = useState<(File | null)[]>([null, null, null, null]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const generateUploadUrl = useMutation(api.reports.generateUploadUrl);
  const saveReport = useMutation(api.reports.saveReport);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const setFile = (index: number, file: File | null) => {
    if (file && file.size > 10 * 1024 * 1024) {
      setErrorMessage("Image file size must be less than 10MB");
      setStatus("error");
      return;
    }
    setFiles((prev) => {
      const next = [...prev];
      next[index] = file;
      return next;
    });
    if (status === "error") setStatus("idle");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const trimmedToken = bookingToken.trim();
    const trimmedPlate = plate.trim();

    if (!trimmedToken) {
      setErrorMessage("Please enter your booking token");
      setStatus("error");
      return;
    }

    if (!trimmedPlate) {
      setErrorMessage("Please enter your license plate");
      setStatus("error");
      return;
    }

    const allPresent = files.every((f) => f != null);
    if (!allPresent) {
      setErrorMessage("Please capture all 4 required photos");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const coords = await getPosition();
      const [id1, id2, id3, id4] = await Promise.all(
        files.map((f) =>
          uploadFile(f!, () =>
            generateUploadUrl({
              bookingToken: trimmedToken,
              licensePlate: trimmedPlate,
            })
          )
        )
      );

      await saveReport({
        bookingToken: trimmedToken,
        licensePlate: trimmedPlate,
        lat: coords.lat,
        lng: coords.lng,
        image1StorageId: id1,
        image2StorageId: id2,
        image3StorageId: id3,
        image4StorageId: id4,
      });

      setStatus("success");
      setBookingToken("");
      setPlate("");
      setFiles([null, null, null, null]);
      inputRefs.current.forEach((el) => {
        if (el) el.value = "";
      });
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    }
  };

  return (
    <div className="min-h-screen bg-background selection:bg-accent selection:text-white">
      <main className="mx-auto max-w-4xl px-6 py-16 md:py-24 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
        <header className="mb-12 text-center md:text-left space-y-4">
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-[0.9]">
            After-Hours Drop-Off Recorder
          </h1>
          <p className="text-xl text-foreground/45 font-semibold tracking-tight">
            Timestamped photo + location evidence for every unattended return.
          </p>
        </header>

        <section className="glass rounded-[2rem] p-7 md:p-9 shadow-2xl mb-8">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-accent mb-3">
            Value Proposition for Rental Owners
          </p>
          <p className="text-base md:text-lg text-foreground/85 leading-relaxed font-medium">
            This demo prevents avoidable loss when a car is dropped off overnight and later found damaged. Every return gets a customer-submitted condition record with time and location proof, reducing false claims, speeding dispute resolution, and protecting revenue from repair costs, chargebacks, and downtime.
          </p>
        </section>

        <div className="grid gap-8 lg:grid-cols-[1.25fr,1fr]">
          <section className="glass rounded-[2.5rem] p-10 md:p-12 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="space-y-4">
                <label
                  htmlFor="bookingToken"
                  className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30 ml-2"
                >
                  Booking Token
                </label>
                <input
                  id="bookingToken"
                  type="text"
                  value={bookingToken}
                  onChange={(e) => setBookingToken(e.target.value)}
                  placeholder="Paste token from your booking confirmation"
                  className="apple-input h-14 w-full rounded-[1.25rem] px-6 text-sm font-bold placeholder:text-foreground/20 focus:outline-none"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-4">
                <label
                  htmlFor="plate"
                  className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30 ml-2"
                >
                  License Plate
                </label>
                <input
                  id="plate"
                  type="text"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  placeholder="ABC 1234"
                  className="apple-input h-16 w-full rounded-[1.25rem] px-8 text-2xl font-bold placeholder:text-foreground/10 focus:outline-none uppercase tracking-widest"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between ml-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30">
                    Required Evidence
                  </span>
                  <span className="text-[10px] font-black text-accent uppercase tracking-widest bg-accent/5 px-3 py-1.5 rounded-full border border-accent/10">
                    4 Captures
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  {LABELS.map((label, i) => (
                    <label
                      key={i}
                      className={`relative flex flex-col items-center justify-center h-36 rounded-[1.5rem] border transition-all cursor-pointer group
                        ${files[i]
                          ? "border-accent bg-accent/5 shadow-inner"
                          : "border-card-border bg-white/[0.02] hover:bg-white/[0.05] hover:border-foreground/20"}`}
                    >
                      <input
                        ref={(el) => {
                          inputRefs.current[i] = el;
                        }}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => setFile(i, e.target.files?.[0] ?? null)}
                        className="sr-only"
                      />

                      {files[i] ? (
                        <div className="flex flex-col items-center gap-2 animate-in zoom-in duration-300">
                          <div className="bg-accent text-white p-2 rounded-full shadow-lg">
                            <CheckIcon />
                          </div>
                          <span className="text-xs font-bold text-accent uppercase tracking-wide">
                            {label} Captured
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-foreground/40 group-hover:text-foreground/70 transition-colors">
                          <CameraIcon />
                          <span className="text-xs font-bold uppercase tracking-wide">
                            {label}
                          </span>
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                {status === "error" && (
                  <div className="mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm font-medium text-red-500 animate-in fade-in zoom-in-95">
                    {errorMessage}
                  </div>
                )}
                {status === "success" && (
                  <div className="mb-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm font-medium text-emerald-500 animate-in fade-in zoom-in-95 text-center">
                    Vehicle report submitted successfully.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="premium-button group h-16 w-full rounded-2xl text-lg font-bold shadow-xl shadow-accent/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {status === "loading" ? (
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <span>Submit Report</span>
                  )}
                </button>
              </div>
            </form>
          </section>

          <aside className="space-y-6">
            <section className="glass rounded-[2rem] p-6 md:p-7 shadow-xl">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-base font-black tracking-tight">Customer App Instructions</h2>
              </div>
              <ol className="space-y-2 text-sm text-foreground/80 list-decimal pl-5">
                {customerSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </section>

            <section className="glass rounded-[2rem] p-6 md:p-7 shadow-xl">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-base font-black tracking-tight">Admin Panel Instructions</h2>
                <Link
                  href="/admin"
                  className="inline-flex items-center rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-bold text-accent hover:bg-accent/20 transition-colors"
                >
                  Open /admin
                </Link>
              </div>
              <ol className="space-y-2 text-sm text-foreground/80 list-decimal pl-5">
                {adminSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </section>
          </aside>
        </div>

        <footer className="mt-10 text-center">
          <p className="text-sm text-foreground/30 font-medium">
            Copyright {new Date().getFullYear()} After-Hours Logistics. All rights reserved.
          </p>
        </footer>
      </main>
    </div>
  );
}
