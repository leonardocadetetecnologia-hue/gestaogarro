import { redirect } from "next/navigation";

export function reject(path: string, message: string): never {
  const join = path.includes("?") ? "&" : "?";
  redirect(`${path}${join}erro=${encodeURIComponent(message)}`);
}

export function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}
