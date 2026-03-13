import DashboardChat from '@/components/dashboard/dashboard-chat';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { auth, currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const { userId, sessionId, orgId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const user = await currentUser();
  const primaryEmail =
    user?.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    'No email address';
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || primaryEmail;
  const lastUpdated = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05010d] px-4 pb-8 pt-8 text-white sm:px-6 sm:pb-10 sm:pt-10">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -left-20 top-8 h-72 w-72 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-violet-500/10 blur-[120px]" />
      </div>

      <section className="relative mx-auto w-full max-w-7xl rounded-[28px] border border-white/12 bg-linear-to-b from-white/8 via-white/3 to-white/2 p-4 shadow-[0_28px_90px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:p-6 xl:p-8">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/95">
              Dashboard
            </p>
            <h1 className="mt-2 truncate text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {displayName}
            </h1>
            <p className="mt-2 truncate text-sm text-white/70">{primaryEmail}</p>
          </div>

          <Button
            asChild
            className="h-10 border border-white/20 bg-white/5 px-4 text-white hover:bg-white/12"
            variant="ghost"
          >
            <Link href="/">Back to Landing</Link>
          </Button>
        </div>

        <Separator className="mb-6 bg-linear-to-r from-transparent via-white/15 to-transparent" />

        <div className="grid items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-white/12 bg-black/35 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/95">
              Session Overview
            </p>

            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-xl border border-white/12 bg-white/3 p-3.5">
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/55">User ID</p>
                <p className="mt-1.5 break-all font-mono text-[13px] text-white/90">{userId}</p>
              </div>

              <div className="rounded-xl border border-white/12 bg-white/3 p-3.5">
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/55">Session ID</p>
                <p className="mt-1.5 break-all font-mono text-[13px] text-white/90">
                  {sessionId ?? 'Unavailable'}
                </p>
              </div>

              <div className="rounded-xl border border-white/12 bg-white/3 p-3.5">
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/55">Organization</p>
                <p className="mt-1.5 break-all font-mono text-[13px] text-white/90">
                  {orgId ?? 'Personal workspace'}
                </p>
              </div>

              <div className="rounded-xl border border-white/12 bg-white/3 p-3.5">
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/55">Last updated</p>
                <p className="mt-1.5 break-all font-mono text-[13px] text-white/90">{lastUpdated}</p>
              </div>
            </div>
          </aside>

          <DashboardChat />
        </div>
      </section>
    </main>
  );
}
