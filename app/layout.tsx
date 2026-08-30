import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { RoleProvider } from "@/lib/role-context";
import { ToastProvider } from "@/lib/toast-context";
import { ToastContainer } from "@/components/ui/ToastContainer";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  weight: ["400", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sejuk Sejuk Ops",
  description: "Aircon service operations system",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${barlow.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-ink">
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
