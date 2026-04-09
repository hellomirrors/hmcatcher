import { getDialogById } from "@/domain/dialog/dialog-repository";
import { DialogEditor } from "./dialog-editor";

export const dynamic = "force-dynamic";

export default async function DialogEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idRaw } = await params;
  const id = Number(idRaw);
  const dialog = getDialogById(id);

  if (!dialog) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Dialog nicht gefunden</p>
      </div>
    );
  }

  return (
    <DialogEditor
      dialog={{
        id: dialog.id,
        name: dialog.name,
        slug: dialog.slug,
        definition: dialog.definition,
      }}
    />
  );
}
