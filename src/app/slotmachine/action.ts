"use server";

import { processContactData } from "@/domain/contact-data-service";
import { contactDataSchema } from "@/domain/schema";
import { createLogger } from "@/lib/logger";

const log = createLogger("action:slotmachine");

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
    log.info("Processing contact data", { email: result.data.email });
    await processContactData(result.data);
    log.info("Contact data processed", { email: result.data.email });
    return { success: true };
  } catch (error) {
    log.error("Contact data processing failed", error, {
      email: result.data.email,
    });
    return { success: false, error: (error as Error).message };
  }
}
