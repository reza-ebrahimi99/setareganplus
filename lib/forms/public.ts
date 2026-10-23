import { prisma } from "@/lib/prisma";
import { parseFields } from "./types";
import type { PublicForm } from "@/components/forms/FormRenderer";

export async function getPublicForm(slug: string): Promise<PublicForm | null> {
  const f = await prisma.form.findUnique({ where: { slug } });
  if (!f || f.status !== "PUBLISHED") return null;
  return {
    slug: f.slug,
    title: f.title,
    description: f.description,
    fields: parseFields(f.fields),
    submitLabel: f.submitLabel,
    successMessage: f.successMessage,
  };
}
