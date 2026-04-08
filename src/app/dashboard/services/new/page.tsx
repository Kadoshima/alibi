import { requireUser } from "@/lib/rbac";
import { ServiceForm } from "./service-form";
import { redirect } from "next/navigation";

export const metadata = { title: "サービス登録" };

export default async function NewServicePage() {
  const user = await requireUser();
  if (user.role !== "PROVIDER" && user.role !== "ADMIN") {
    redirect("/dashboard");
  }
  return (
    <div className="container max-w-2xl py-10">
      <h1 className="text-3xl font-bold">サービス登録</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        登録されたサービスは管理者による審査後、公開されます。
      </p>
      <div className="mt-8">
        <ServiceForm />
      </div>
    </div>
  );
}
