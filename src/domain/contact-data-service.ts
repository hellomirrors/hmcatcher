import type { ContactData } from "./schema";

export function processContactData(data: ContactData): Promise<void> {
  console.log(JSON.stringify(data, null, 2));
  return Promise.resolve();
}
