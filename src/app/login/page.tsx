import { AUTH_MODE } from "@/lib/auth-mode";
import { AuthentikLogin } from "./authentik-login";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const from = typeof params.from === "string" ? params.from : "/admin";
  const error = typeof params.error === "string" ? params.error : undefined;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {AUTH_MODE === "authentik" ? (
        <AuthentikLogin error={error} from={from} />
      ) : (
        <LoginForm from={from} />
      )}
    </div>
  );
}
