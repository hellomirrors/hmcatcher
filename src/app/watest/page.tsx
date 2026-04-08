import { SendForm } from "./send-form";

export const dynamic = "force-dynamic";

export default function WatestPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <SendForm />
    </div>
  );
}
