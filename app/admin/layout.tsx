// CLERK AUTH DISABLED — uncomment to re-enable
// import { SignedIn, UserButton } from "@clerk/nextjs";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="flex justify-between items-center px-6 py-3 border-b border-zinc-800">
        <span className="text-sm font-semibold text-zinc-400 tracking-wide uppercase">
          Staff Admin
        </span>
        {/* CLERK AUTH DISABLED — uncomment to re-enable:
        <SignedIn>
          <UserButton />
        </SignedIn>
        */}
      </header>
      {children}
    </div>
  );
}
