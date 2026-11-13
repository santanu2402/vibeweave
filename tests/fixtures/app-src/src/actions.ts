"use server";

export async function saveDraft(form: FormData) {
  return { ok: true, title: form.get("title") };
}
