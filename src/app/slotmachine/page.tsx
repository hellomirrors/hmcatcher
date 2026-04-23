import { getActiveDialog } from "@/domain/dialog/dialog-repository";
import type { ScoreBucket } from "@/domain/dialog/dialog-schema";
import { SlotForm } from "./slot-form";

export const dynamic = "force-dynamic";

const TERMS_URL = "https://hellomirrors.com/essen";

export default function SlotmachinePage() {
  const dialog = getActiveDialog();
  const scoreBuckets: ScoreBucket[] = dialog?.definition.scoreBuckets ?? [];

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <SlotForm scoreBuckets={scoreBuckets} termsUrl={TERMS_URL} />
    </div>
  );
}
