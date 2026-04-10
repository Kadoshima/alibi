import { requireUser } from "@/lib/rbac";
import { getBalance } from "@/lib/credits";
import { Badge } from "@/components/ui/badge";
import { TicketEditor } from "./ticket-editor";

export const metadata = { title: "チケット日付編集" };

export default async function TicketEditPage() {
  const user = await requireUser();
  const credits = await getBalance(user.id);

  return (
    <div className="container max-w-3xl py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">チケット日付編集</h1>
          <p className="mt-1 text-muted-foreground">
            チケット画像をアップロードして、日付部分だけを書き換えます。
          </p>
        </div>
        <Badge variant="outline" className="text-base">
          残り: {credits} CR
        </Badge>
      </div>

      <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        ⚠️ 領収書・レシート・請求書は自動検出されてブロックされます。チケットのみ利用可能です。
      </div>

      <div className="mt-8">
        <TicketEditor credits={credits} />
      </div>
    </div>
  );
}
