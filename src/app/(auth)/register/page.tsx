import { RegisterForm } from "./register-form";

export const metadata = { title: "新規登録" };

export default function RegisterPage() {
  return (
    <div className="container max-w-md py-16">
      <h1 className="text-2xl font-bold">新規登録</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        既にアカウントをお持ちの方は
        <a href="/login" className="ml-1 text-primary underline">
          ログイン
        </a>
      </p>
      <div className="mt-8">
        <RegisterForm />
      </div>
    </div>
  );
}
