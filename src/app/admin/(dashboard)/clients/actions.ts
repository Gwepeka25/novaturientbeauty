"use server";

import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-auth";
import { eraseClientData } from "@/lib/client-data";

export async function deleteClientData(formData: FormData) {
  const session = await requireAdminSession();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const confirmEmail = String(formData.get("confirmEmail") || "").trim().toLowerCase();

  if (!email) redirect("/admin/clients");
  if (email !== confirmEmail) {
    redirect(`/admin/clients?email=${encodeURIComponent(email)}&error=confirm_mismatch`);
  }

  await eraseClientData(email, session.sub);

  redirect("/admin/clients?deleted=1");
}
