import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const from = typeof params.from === "string" ? params.from : "/admin";

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <LoginForm from={from} />
    </div>
  );
}
