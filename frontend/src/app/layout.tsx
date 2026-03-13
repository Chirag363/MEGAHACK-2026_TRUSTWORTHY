import type { Metadata } from 'next';
import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: 'InsightForge – AI-Orchestrated Data Analytics Platform',
  description:
    'InsightForge uses specialized AI agents to automate data cleaning, analysis, visualization, and insight generation. Turn raw datasets into actionable business intelligence in minutes.',
  keywords: ['AI analytics', 'data insights', 'business intelligence', 'AI agents', 'data automation'],
  openGraph: {
    title: 'InsightForge – AI-Orchestrated Data Analytics',
    description: 'Turn raw data into strategic insights with AI-powered analytics agents.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <ClerkProvider>
          <header className="fixed right-4 top-4 z-[10001]">
            <div className="flex items-center gap-2 rounded-full border border-white/20 bg-[#0d0716]/85 px-3 py-2 text-sm text-white shadow-[0_12px_40px_rgba(0,0,0,0.28)] backdrop-blur">
              <Show when="signed-out">
                <SignInButton>
                  <button
                    type="button"
                    className="rounded-full border border-white/15 px-3 py-1.5 font-medium text-white transition hover:bg-white/10"
                  >
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton>
                  <button
                    type="button"
                    className="rounded-full bg-white px-3 py-1.5 font-semibold text-[#0d0716] transition hover:bg-white/90"
                  >
                    Sign Up
                  </button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <a
                  href="/workspace"
                  className="rounded-full border border-white/15 px-3 py-1.5 font-medium text-white transition hover:bg-white/10"
                >
                  Workspace
                </a>
                <UserButton />
              </Show>
            </div>
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
