import { listDialogs } from "@/domain/dialog/dialog-repository";
import { seedDefaultDialog } from "@/domain/dialog/seed-default-dialog";
import { DialogList } from "./dialog-list";

export const dynamic = "force-dynamic";

export default function DialogsPage() {
  seedDefaultDialog();
  const dialogs = listDialogs();

  return (
    <div className="mx-auto w-full max-w-3xl p-4">
      <DialogList dialogs={dialogs} />
    </div>
  );
}
