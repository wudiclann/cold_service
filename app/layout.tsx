import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { RoleProvider } from "@/lib/role-context";
import { ToastProvider } from "@/lib/toast-context";
import { ToastContainer } from "@/components/ui/ToastContainer";
import "./globals.css";

const plex = IBM_Plex_Sans({
  variable: "--font-plex",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
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
