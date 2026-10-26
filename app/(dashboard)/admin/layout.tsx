import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getEmailDeliveryStatus } from "@/lib/email-config";
import { AdminNav } from "@/components/admin/admin-nav";
import { EmailStatusBanner } from "@/components/admin/email-status-banner";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/login?callbackUrl=/admin");
  }

  const emailStatus = getEmailDeliveryStatus(process.env);

  return (
    <div>
      <AdminNav />
      {emailStatus.state !== "ready" && <EmailStatusBanner state={emailStatus.state} />}
      {children}
    </div>
  );
}
