"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteLeadById } from "@/domain/leads/lead-repository";

export async function deleteLeadAction(id: number): Promise<void> {
  deleteLeadById(id);
  await revalidatePath("/leads");
  await revalidatePath("/leads/dashboard");
  redirect("/leads");
}
