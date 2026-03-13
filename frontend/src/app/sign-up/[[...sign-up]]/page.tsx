import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#05010d] px-6 py-24">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur">
        <SignUp path="/sign-up" routing="path" forceRedirectUrl="/dashboard" />
      </div>
    </main>
  );
}
