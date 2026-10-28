import { TriangleAlert } from "lucide-react";
import { supabaseConfigured } from "@/lib/supabase/config";

/** Shown only while Supabase has no keys: the app is running as an empty template. */
export function SetupNotice({ className = "" }: { className?: string }) {
  if (supabaseConfigured) return null;
  return (
    <div
      role="status"
      className={`flex items-start gap-2.5 bg-[#fffbeb] border-[#fde68a] text-[#92400e] text-[13px] leading-5 px-4 py-2.5 ${className}`}
    >
      <TriangleAlert size={16} strokeWidth={1.75} className="shrink-0 mt-0.5" aria-hidden />
      <p>
        Supabase isn&apos;t set up yet, so there is no data to show. Add{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and{" "}
        <code className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code> to{" "}
        <code className="font-mono text-xs">.env.local</code>, then restart the dev server.
      </p>
    </div>
  );
}
