import { LoginForm } from "./login-form";

export const metadata = { title: "ログイン" };

export default function LoginPage() {
  return (
    <div className="container max-w-md py-16">
      <h1 className="text-2xl font-bold">ログイン</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        アカウントをお持ちでない方は
        <a href="/register" className="ml-1 text-primary underline">
          新規登録
        </a>
      </p>
      <div className="mt-8">
        <LoginForm />
      </div>
    </div>
  );
}
