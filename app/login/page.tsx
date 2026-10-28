import { LoginForm } from "@/app/login/login-form"

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-4">
        <div className="text-center">
          <h1 className="text-base font-medium">Issue Lane</h1>
          <p className="mt-1 text-muted-foreground">One team. Board, list, and projects.</p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
