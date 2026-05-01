import { Suspense } from "react";
import { LogoLockup } from "@/components/Logo";
import { LoginForm } from "./LoginForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="min-h-screen grid place-items-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><LogoLockup /></div>
        <div className="card card-pad">
          <h1 className="font-display text-2xl text-bone">Welcome back</h1>
          <p className="mt-1 text-sm text-bone-300/70">Sign in to your operations workspace.</p>
          <div className="mt-6">
            <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-white/5" />}>
              <LoginForm />
            </Suspense>
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-bone-300/60">
          New here?{" "}
          <Link href="/signup" className="text-mint hover:underline">Create an account</Link>
        </p>
      </div>
    </main>
  );
}
