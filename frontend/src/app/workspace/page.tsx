import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function WorkspacePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#05010d] px-6 py-24 text-white">
      <section className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur">
        <p className="mb-3 text-sm uppercase tracking-[0.28em] text-cyan-300">Protected route</p>
        <h1 className="text-3xl font-semibold tracking-tight">Workspace access is active.</h1>
        <p className="mt-4 text-base leading-7 text-white/70">
          Clerk authentication is now wired into the App Router. You are signed in and this page
          was unlocked with <code className="rounded bg-white/10 px-2 py-1 text-sm">await auth()</code>.
        </p>
        <p className="mt-6 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80">
          Signed-in user ID: <span className="font-mono">{userId}</span>
        </p>
      </section>
    </main>
  );
}
