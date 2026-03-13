"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { CommandIcon, MessageSquareTextIcon, BarChart3Icon, MessagesSquareIcon, DatabaseIcon, BrainCircuitIcon, LineChartIcon, LightbulbIcon, ClipboardListIcon, ArrowLeftIcon } from "lucide-react"

const navItems = [
  {
    title: "Chat",
    url: "/dashboard/chat",
    icon: MessageSquareTextIcon,
    description: "AI data analysis",
  },
  {
    title: "Reports",
    url: "/dashboard/report",
    icon: BarChart3Icon,
    description: "Generated insights",
  },
]

const agentItems = [
  {
    name: "Casual Convo",
    icon: MessagesSquareIcon,
    description: "Greetings & small talk",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
  },
  {
    name: "Data Cleaning",
    icon: DatabaseIcon,
    description: "Quality & completeness",
    color: "text-sky-400",
    bg: "bg-sky-400/10",
  },
  {
    name: "Feature Analysis",
    icon: BrainCircuitIcon,
    description: "Stats & correlations",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
  },
  {
    name: "Visualization",
    icon: LineChartIcon,
    description: "Charts & diagrams",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  {
    name: "Insights",
    icon: LightbulbIcon,
    description: "Pattern synthesis",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  {
    name: "Recommendations",
    icon: ClipboardListIcon,
    description: "Actionable steps",
    color: "text-rose-400",
    bg: "bg-rose-400/10",
  },
]

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string
    email: string
    avatar: string
  }
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="offcanvas" {...props}>

      {/* ── Brand header ── */}
      <SidebarHeader className="px-3 pb-3 pt-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              className="h-auto cursor-pointer rounded-xl px-3 py-2.5 hover:bg-white/5"
            >
              <Link href="/dashboard" className="flex items-center gap-3">
                {/* Icon with glow ring */}
                <div className="relative flex size-8 shrink-0 items-center justify-center">
                  <div className="absolute inset-0 rounded-lg bg-cyan-400/20 blur-[6px]" />
                  <div className="relative flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400/25 via-white/10 to-indigo-400/20 ring-1 ring-white/15">
                    <CommandIcon className="size-4 text-cyan-300" />
                  </div>
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="text-[15px] font-semibold tracking-tight text-white">
                    InsightForge
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Separator with gradient */}
        <div className="mt-2 h-px w-full bg-gradient-to-r from-transparent via-white/12 to-transparent" />

        <Link
          href="/"
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/12 bg-white/[0.03] px-3 py-2 text-xs text-white/70 transition hover:bg-white/[0.08] hover:text-white"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to Landing Page
        </Link>
      </SidebarHeader>

      {/* ── Nav ── */}
      <SidebarContent className="px-3 pt-2">
        <SidebarGroup className="p-0">
          {/* Section label */}
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/28">
            Workspace
          </p>

          <SidebarGroupContent>
            <SidebarMenu className="gap-3">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.url || pathname.startsWith(item.url + "/")

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={cn(
                        // Base
                        "group/nav h-auto cursor-pointer gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
                        // Default text
                        "text-sidebar-foreground/60 hover:text-white",
                        // Hover bg
                        "hover:bg-white/[0.06]",
                        // Active overrides
                        isActive && [
                          "bg-gradient-to-r from-cyan-400/[0.13] via-cyan-400/[0.06] to-transparent",
                          "text-white shadow-[inset_2px_0_0_rgba(34,211,238,0.65)]",
                          "hover:bg-gradient-to-r hover:from-cyan-400/[0.16] hover:via-cyan-400/[0.08] hover:to-transparent",
                        ],
                      )}
                    >
                      <Link href={item.url} className="flex w-full items-center gap-3">
                        <div
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors duration-200",
                            isActive
                              ? "bg-cyan-400/15 text-cyan-300"
                              : "bg-white/5 text-white/40 group-hover/nav:bg-white/8 group-hover/nav:text-white/70"
                          )}
                        >
                          <item.icon className="size-3.5" />
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <span
                            className={cn(
                              "text-[13px] font-medium leading-tight",
                              isActive ? "text-white" : "text-white/65 group-hover/nav:text-white/85"
                            )}
                          >
                            {item.title}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] leading-tight",
                              isActive ? "text-cyan-300/60" : "text-white/28 group-hover/nav:text-white/40"
                            )}
                          >
                            {item.description}
                          </span>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Separator */}
        <div className="my-3 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* ── Active Agents ── */}
        <SidebarGroup className="p-0">
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/28">
            Active Agents
          </p>
          <SidebarGroupContent>
            <div className="flex flex-col gap-1">
              {agentItems.map((agent) => (
                <div
                  key={agent.name}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-1.5"
                >
                  <div className={cn("flex size-6 shrink-0 items-center justify-center rounded-md", agent.bg)}>
                    <agent.icon className={cn("size-3", agent.color)} />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="text-[12px] font-medium leading-tight text-white/60">
                      {agent.name}
                    </span>
                    <span className="text-[10px] leading-tight text-white/25">
                      {agent.description}
                    </span>
                  </div>
                  <div className="ml-auto size-1.5 shrink-0 rounded-full bg-emerald-400/70" />
                </div>
              ))}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Spacer area with subtle decoration ── */}
        <div className="mt-auto flex flex-col items-center justify-center gap-3 py-6 opacity-[0.18]">
          <div className="h-px w-10 rounded-full bg-white/40" />
          <CommandIcon className="size-6 text-white/60" />
          <div className="h-px w-10 rounded-full bg-white/40" />
        </div>
      </SidebarContent>

      {/* ── User footer ── */}
      <SidebarFooter className="px-3 pb-4 pt-0">
        <div className="mb-3 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
