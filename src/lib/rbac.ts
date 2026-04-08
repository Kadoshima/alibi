import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import type { UserRole } from "@prisma/client";

export async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return session.user;
}

export async function requireRole(role: UserRole) {
  const user = await requireUser();
  if (user.role !== role && user.role !== "ADMIN") {
    redirect("/forbidden");
  }
  return user;
}

export async function requireAdmin() {
  return requireRole("ADMIN");
}

export async function getOptionalUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}
