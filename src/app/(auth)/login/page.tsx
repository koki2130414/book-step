import { Suspense } from "react";
import { LoginForm } from "./login-form";

// useSearchParams()を使用するため、Suspenseで囲んでプリレンダリングエラーを防ぐ
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
