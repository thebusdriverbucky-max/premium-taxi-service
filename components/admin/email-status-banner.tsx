import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { EmailDeliveryState } from "@/lib/email-config";

const messages: Record<Exclude<EmailDeliveryState, "ready">, string> = {
  "not-configured":
    "Email delivery is not configured: booking confirmations, password resets and contact form messages are not being sent.",
  "test-sender":
    "EMAIL_FROM is not set: emails are sent from the Resend test address and only reach your own Resend account email.",
};

export function EmailStatusBanner({ state }: { state: Exclude<EmailDeliveryState, "ready"> }) {
  return (
    <div role="status" className="bg-amber-500/10 border-b border-amber-500/20">
      <div className="container mx-auto px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-amber-200">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>{messages[state]}</span>
        <Link href="/admin/settings" className="underline underline-offset-2 whitespace-nowrap hover:text-amber-100">
          Review settings
        </Link>
      </div>
    </div>
  );
}
