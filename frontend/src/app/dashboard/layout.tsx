import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import type { CSSProperties } from 'react';

const sidebarStyles = {
  '--sidebar-width': 'calc(var(--spacing) * 72)',
  '--header-height': 'calc(var(--spacing) * 12)',
} as CSSProperties;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const user = await currentUser();
  const primaryEmail =
    user?.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    'No email address';
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || 'User';

  return (
    <SidebarProvider style={sidebarStyles}>
      <AppSidebar
        user={{
          name: displayName,
          email: primaryEmail,
          avatar: user?.imageUrl ?? '',
        }}
        variant="inset"
      />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
