import type { Metadata } from "next";
import localFont from "next/font/local";
import { RoleProvider } from "@/lib/role-context";
import { ToastProvider } from "@/lib/toast-context";
import { ToastContainer } from "@/components/ui/ToastContainer";
import "./globals.css";

// Bundled in app/fonts so the build never depends on fetching them from Google
// (IBM Plex Sans is a variable font with a width axis, which Vercel's font loader rejects).
const plex = localFont({
  src: "./fonts/IBMPlexSans-Variable.woff2",
  weight: "100 700",
  style: "normal",
  variable: "--font-plex",
  display: "swap",
});

const plexMono = localFont({
  src: [
    { path: "./fonts/IBMPlexMono-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/IBMPlexMono-500.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cold Service Ops",
  description: "Aircon service operations system",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${plex.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-ground text-ink">
        <RoleProvider>
          <ToastProvider>
            {children}
            <ToastContainer />
          </ToastProvider>
        </RoleProvider>
      </body>
    </html>
  );
}
