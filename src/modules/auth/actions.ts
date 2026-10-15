"use server";
import { redirect } from "next/navigation";
import { destroySession } from "@/lib/auth";
import { loginDestination } from "@/lib/login-route";
import { signIn } from "./sign-in";

export async function login(_state: { error?: string } | undefined, formData: FormData) {
  const result = await signIn({
    login: formData.get("login") ?? formData.get("email"),
    password: formData.get("password"), selectedRole: formData.get("selectedRole"),
  }, formData.get("rememberMe") === "1");
  if ("error" in result) return result;
  redirect(loginDestination(result.role));
}
export async function logout() {
  await destroySession();
  redirect("/login");
}
