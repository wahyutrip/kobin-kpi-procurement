import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kobin Procurement KPI",
  description: "Monthly procurement KPI achievement monitoring",
};

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/data", label: "Data" },
  { href: "/upload", label: "Upload data" },
  { href: "/uploads", label: "History" },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-screen-2xl items-center gap-10 px-6 py-3.5">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-sm font-black text-white">
                K
              </span>
              <span className="leading-none">
                <span className="block text-sm font-bold tracking-tight text-slate-900">
                  Kobin Group
                </span>
                <span className="block text-[11px] font-medium text-slate-500">
                  Procurement KPI
                </span>
              </span>
            </Link>
            <nav className="flex gap-1 text-sm font-medium">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-screen-2xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
