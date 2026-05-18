// app/profile/page.tsx

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProfileActions } from "./profile-actions";
import { db } from "@/lib/db";
import { ProfileForm } from "@/components/profile/profile-form";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center bg-taxi-gold-gradient bg-clip-text text-transparent">My Profile</h1>

      <ProfileForm user={user} />

      <div className="max-w-2xl mx-auto mt-8 flex justify-end">
        <ProfileActions />
      </div>
    </div>
  );
}

