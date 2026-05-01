import { LogoLockup } from "@/components/Logo";
import { SignupForm } from "./SignupForm";
import Link from "next/link";

export default function SignupPage() {
  return (
    <main className="min-h-screen grid place-items-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><LogoLockup /></div>
        <div className="card card-pad">
          <h1 className="font-display text-2xl text-bone">Create your account</h1>
          <p className="mt-1 text-sm text-bone-300/70">Story of your life starts here.</p>
          <div className="mt-6"><SignupForm /></div>
        </div>
        <p className="mt-6 text-center text-sm text-bone-300/60">
          Already have one?{" "}
          <Link href="/login" className="text-mint hover:underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
