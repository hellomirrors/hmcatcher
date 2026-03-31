"use server";

import { processContactData } from "@/domain/contact-data-service";
import { contactDataSchema } from "@/domain/schema";

export interface ContactFormState {
  error?: string;
  errors?: Record<string, string[]>;
  success: boolean;
}

export async function submitContactData(
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const result = contactDataSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    mobile: formData.get("mobile"),
    message: formData.get("message"),
  });

  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) {
        fieldErrors[key] = [];
      }
      fieldErrors[key].push(issue.message);
    }
    return { success: false, errors: fieldErrors };
  }

  try {
    await processContactData(result.data);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
