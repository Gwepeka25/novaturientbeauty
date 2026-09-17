"use server";

import { submitReview, ReviewLinkInvalidError } from "@/lib/reviews";

export async function submitReviewAction(
  _prev: { error?: string; ok?: boolean },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const token = String(formData.get("token") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const displayNameMode = String(formData.get("displayNameMode") ?? "anonymous");
  const consentPublic = formData.get("consentPublic") === "on";

  if (!body) return { error: "Please write a few words before submitting." };
  if (body.length > 1000) return { error: "Please keep your review under 1000 characters." };
  if (!["first_name", "initials", "anonymous"].includes(displayNameMode)) {
    return { error: "Invalid selection." };
  }

  try {
    await submitReview({
      token,
      body,
      displayNameMode: displayNameMode as "first_name" | "initials" | "anonymous",
      consentPublic,
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof ReviewLinkInvalidError) return { error: error.message };
    console.error("Review submission failed:", error);
    return { error: "Something went wrong. Please try again." };
  }
}
