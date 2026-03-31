import { SendForm } from "./send-form";

export default function WatestPage() {
  const provider = process.env.MESSAGING_PROVIDER ?? "whatsapp";

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <SendForm provider={provider} />
    </div>
  );
}
