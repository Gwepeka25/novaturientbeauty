"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";

const EXPENSE_CATEGORIES = [
  "rent",
  "supplies",
  "marketing",
  "software",
  "insurance",
  "training",
  "other",
] as const;

const expenseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().trim().min(1),
  amountEuros: z.coerce.number().positive(),
});

export async function addExpense(formData: FormData) {
  await requireAdminSession();
  const parsed = expenseSchema.parse({
    date: formData.get("date"),
    category: formData.get("category"),
    description: formData.get("description"),
    amountEuros: formData.get("amountEuros"),
  });

  await prisma.expense.create({
    data: {
      date: parsed.date,
      category: parsed.category,
      description: parsed.description,
      amountCents: Math.round(parsed.amountEuros * 100),
    },
  });
  revalidatePath("/admin/finances");
}

export async function deleteExpense(id: string) {
  await requireAdminSession();
  await prisma.expense.delete({ where: { id } });
  revalidatePath("/admin/finances");
}
