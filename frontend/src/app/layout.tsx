import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/theme-provider';
import ThemeToggle from '@/components/theme-toggle';
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
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <ClerkProvider>
          <ThemeProvider>
            <TooltipProvider>
              {children}
              <ThemeToggle />
            </TooltipProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
