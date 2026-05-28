import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { Toaster } from "sonner";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "MedCare Clinic — Book an Appointment",
  description: "Book your doctor appointment online at MedCare Clinic. Easy scheduling, reminders, and management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#090d16]" suppressHydrationWarning>
        <Navigation />
        <main className="flex-1 bg-[#090d16]">{children}</main>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#0d1527",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "#f8fafc",
              fontSize: "14px",
            },
          }}
        />
        <footer className="border-t border-white/5 bg-[#090d16] py-10 mt-auto">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
            <p className="text-xs text-slate-400">
              &copy; {new Date().getFullYear()} MedCare Clinic. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-xs text-slate-400">
              <span className="flex items-center gap-2 hover:text-[#06b6d4] transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                01711000000
              </span>
              <span className="flex items-center gap-2 hover:text-[#06b6d4] transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                clinic@medcare.com
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
