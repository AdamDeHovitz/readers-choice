import { isLocalPath } from "@readers-choice/core/local-path";
import { LoginForm } from "@/components/auth/login-form";

interface LoginPageProps {
  searchParams: Promise<{
    callbackUrl?: string | string[];
  }>;
}

function getSafeCallbackUrl(
  callbackUrl: string | string[] | undefined
): string {
  const value = Array.isArray(callbackUrl) ? callbackUrl[0] : callbackUrl;
  return isLocalPath(value) ? value : "/dashboard";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const callbackUrl = getSafeCallbackUrl(params.callbackUrl);

  return <LoginForm callbackUrl={callbackUrl} />;
}
