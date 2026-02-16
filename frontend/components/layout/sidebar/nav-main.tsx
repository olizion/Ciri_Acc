"use client";

import { useState, useEffect } from "react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar";
import {
  LayoutDashboardIcon,
  FileTextIcon,
  ReceiptIcon,
  UsersIcon,
  FileBarChartIcon,
  ClipboardCheckIcon,
  SettingsIcon,
  WalletIcon,
  TrendingUpIcon,
  CalendarIcon,
  BellIcon,
  ShieldCheckIcon,
  HelpCircleIcon,
  BrainCircuitIcon,
  ActivityIcon,
  LandmarkIcon,
  BookOpenIcon,
  ScaleIcon,
  MailIcon,
  type LucideIcon
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type NavGroup = {
  title: string;
  icon?: LucideIcon;
  items: NavItem;
};

type NavItem = {
  title: string;
  href: string;
  icon?: LucideIcon;
  isComing?: boolean;
  isDataBadge?: string;
  newTab?: boolean;
  items?: NavItem;
}[];

export const navItems: NavGroup[] = [
  {
    title: "Oversikt",
    icon: LayoutDashboardIcon,
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon },
      { title: "Ciri AI", href: "/dashboard/chat", icon: BrainCircuitIcon },
      { title: "Aktivitet", href: "/dashboard/aktivitet", icon: ActivityIcon }
    ]
  },
  {
    title: "Bank",
    icon: LandmarkIcon,
    items: [
      { title: "Transaksjoner", href: "/dashboard/bank", icon: LandmarkIcon },
      { title: "Faktura", href: "/dashboard/bank/faktura", icon: ReceiptIcon },
      { title: "Avstemming", href: "/dashboard/bank/avstemming", icon: ScaleIcon },
      { title: "Koble til bank", href: "/dashboard/bank/accounts/connect", icon: LandmarkIcon },
      { title: "Regler", href: "/dashboard/bank/regler", icon: SettingsIcon }
    ]
  },
  {
    title: "Regnskap",
    icon: FileTextIcon,
    items: [
      { title: "Bilag", href: "/dashboard/bilag", icon: FileTextIcon },
      { title: "MVA", href: "/dashboard/mva", icon: ReceiptIcon },
      { title: "Hovedbok", href: "/dashboard/hovedbok", icon: BookOpenIcon },
      { title: "Resultat", href: "/dashboard/resultat", icon: TrendingUpIcon },
      { title: "Balanse", href: "/dashboard/balanse", icon: ScaleIcon }
    ]
  },
  {
    title: "Lønn",
    icon: UsersIcon,
    items: [
      { title: "Lønnsoversikt", href: "/dashboard/lonn", icon: UsersIcon },
      { title: "Feriepenger", href: "/dashboard/lonn/feriepenger", icon: CalendarIcon }
    ]
  },
  {
    title: "Rapporter",
    icon: FileBarChartIcon,
    items: [
      { title: "Alle rapporter", href: "/dashboard/rapporter", icon: FileBarChartIcon },
      { title: "Årsregnskap", href: "/dashboard/arsregnskap", icon: ClipboardCheckIcon }
    ]
  },
  {
    title: "System",
    icon: SettingsIcon,
    items: [
      { title: "Varsler", href: "/dashboard/varsler", icon: BellIcon },
      { title: "E-post", href: "/dashboard/innstillinger/email", icon: MailIcon },
      { title: "Innstillinger", href: "/dashboard/innstillinger", icon: SettingsIcon },
      { title: "Sikkerhet", href: "/dashboard/sikkerhet", icon: ShieldCheckIcon },
      { title: "Hjelp", href: "/dashboard/hjelp", icon: HelpCircleIcon }
    ]
  }
];

export function NavMain() {
  const pathname = usePathname();
  const { isMobile } = useSidebar();

  // Track which group is being hovered for micro-interactions
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);

  // Check if any item in a group is active
  const isGroupActive = (group: NavGroup) => {
    return group.items.some((item) => pathname === item.href);
  };

  // Initialize open sections based on active items
  const getInitialOpenSections = () => {
    return navItems.filter((group) => isGroupActive(group)).map((group) => group.title);
  };

  const [openSections, setOpenSections] = useState<string[]>(getInitialOpenSections);

  // Update open sections when pathname changes
  useEffect(() => {
    const activeSections = navItems
      .filter((group) => isGroupActive(group))
      .map((group) => group.title);

    setOpenSections((prev) => {
      const newSections = [...prev];
      activeSections.forEach((section) => {
        if (!newSections.includes(section)) {
          newSections.push(section);
        }
      });
      return newSections;
    });
  }, [pathname]);

  const toggleSection = (title: string) => {
    setOpenSections((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarGroup className="px-3">
        <SidebarGroupContent className="mt-2 flex flex-col gap-1">
          <SidebarMenu className="gap-1">
            {navItems.map((nav) => {
              const isOpen = openSections.includes(nav.title);
              const hasActiveItem = isGroupActive(nav);
              const GroupIcon = nav.icon;
              const isHovered = hoveredGroup === nav.title;

              // If only one item in the group, render as a direct link
              if (nav.items.length === 1) {
                const item = nav.items[0];
                const ItemIcon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <SidebarMenuItem
                    key={nav.title}
                    onMouseEnter={() => setHoveredGroup(nav.title)}
                    onMouseLeave={() => setHoveredGroup(null)}>
                    {/* Collapsed sidebar - centered icon button */}
                    <div className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300",
                              isActive
                                ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                            )}>
                            {ItemIcon && <ItemIcon className="h-4 w-4" />}
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8}>
                          {item.title}
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Expanded sidebar */}
                    <Link href={item.href} className="block group-data-[collapsible=icon]:hidden">
                      <div
                        className={cn(
                          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-300 ease-out",
                          "text-muted-foreground",
                          "hover:from-muted hover:bg-gradient-to-r hover:to-transparent",
                          isActive &&
                            "bg-gradient-to-r from-[var(--primary)]/10 to-transparent text-[var(--primary)]"
                        )}>
                        {/* Active indicator line */}
                        <div
                          className={cn(
                            "absolute top-1/2 left-0 w-0.5 -translate-y-1/2 rounded-full transition-all duration-300",
                            isActive
                              ? "h-5 bg-[var(--primary)]"
                              : isHovered
                                ? "bg-muted-foreground/30 h-3"
                                : "h-0 bg-transparent"
                          )}
                        />

                        {/* Icon with glow effect */}
                        <div
                          className={cn(
                            "relative flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300",
                            isActive
                              ? "bg-[var(--primary)]/10 text-[var(--primary)] shadow-[var(--primary)]/20 shadow-sm"
                              : "bg-muted text-muted-foreground group-hover:bg-muted/80 group-hover:text-foreground"
                          )}>
                          {ItemIcon && (
                            <ItemIcon className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                          )}
                        </div>

                        {/* Label */}
                        <span
                          className={cn(
                            "text-sm font-medium transition-colors duration-200",
                            isActive && "text-[var(--primary)]"
                          )}>
                          {item.title}
                        </span>
                      </div>
                    </Link>
                  </SidebarMenuItem>
                );
              }

              // Multiple items - render as expandable group
              return (
                <SidebarMenuItem
                  key={nav.title}
                  onMouseEnter={() => setHoveredGroup(nav.title)}
                  onMouseLeave={() => setHoveredGroup(null)}>
                  {/* Collapsed sidebar - dropdown menu */}
                  <div className="hidden group-data-[collapsible=icon]:block">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className={cn(
                            "group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300",
                            hasActiveItem
                              ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                          )}>
                          {GroupIcon && <GroupIcon className="h-4 w-4" />}

                          {/* Active dot indicator */}
                          {hasActiveItem && (
                            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[var(--primary)]" />
                          )}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        side={isMobile ? "bottom" : "right"}
                        align={isMobile ? "end" : "start"}
                        sideOffset={8}
                        className="min-w-52 rounded-xl border p-2 shadow-xl backdrop-blur-sm">
                        <div className="mb-2 px-2 py-1.5">
                          <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                            {nav.title}
                          </span>
                        </div>
                        {nav.items.map((item) => {
                          const ItemIcon = item.icon;
                          const isActive = pathname === item.href || item.items?.some(sub => pathname === sub.href);
                          const hasSubItems = item.items && item.items.length > 0;

                          if (hasSubItems) {
                            return (
                              <div key={item.title}>
                                <div className="px-3 py-1.5 mt-2 first:mt-0">
                                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    {ItemIcon && <ItemIcon className="h-3.5 w-3.5" />}
                                    {item.title}
                                  </span>
                                </div>
                                {item.items?.map((subItem) => {
                                  const isSubActive = pathname === subItem.href;
                                  return (
                                    <DropdownMenuItem
                                      key={subItem.title}
                                      asChild
                                      className={cn(
                                        "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 ml-2 transition-all",
                                        isSubActive
                                          ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                      )}>
                                      <Link href={subItem.href}>
                                        <span className="text-sm">{subItem.title}</span>
                                      </Link>
                                    </DropdownMenuItem>
                                  );
                                })}
                              </div>
                            );
                          }

                          return (
                            <DropdownMenuItem
                              key={item.title}
                              asChild
                              className={cn(
                                "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-all",
                                isActive
                                  ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              )}>
                              <Link href={item.href}>
                                {ItemIcon && (
                                  <div
                                    className={cn(
                                      "flex h-7 w-7 items-center justify-center rounded-md",
                                      isActive
                                        ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                                        : "bg-muted text-muted-foreground"
                                    )}>
                                    <ItemIcon className="h-3.5 w-3.5" />
                                  </div>
                                )}
                                <span className="text-sm font-medium">{item.title}</span>
                              </Link>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Expanded sidebar - creative expandable */}
                  <div className="block group-data-[collapsible=icon]:hidden">
                    {/* Group header button */}
                    <button
                      onClick={() => toggleSection(nav.title)}
                      className={cn(
                        "group/trigger relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-300 ease-out",
                        "text-muted-foreground",
                        "hover:from-muted hover:bg-gradient-to-r hover:to-transparent",
                        (isOpen || hasActiveItem) && "text-foreground"
                      )}>
                      {/* Active indicator line */}
                      <div
                        className={cn(
                          "absolute top-1/2 left-0 w-0.5 -translate-y-1/2 rounded-full transition-all duration-300",
                          hasActiveItem
                            ? "h-5 bg-[var(--primary)]"
                            : isHovered
                              ? "bg-muted-foreground/30 h-3"
                              : "h-0 bg-transparent"
                        )}
                      />

                      {/* Icon */}
                      <div
                        className={cn(
                          "relative flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300",
                          hasActiveItem
                            ? "bg-[var(--primary)]/10 text-[var(--primary)] shadow-[var(--primary)]/20 shadow-sm"
                            : isOpen
                              ? "bg-muted/80 text-foreground"
                              : "bg-muted text-muted-foreground group-hover/trigger:bg-muted/80 group-hover/trigger:text-foreground"
                        )}>
                        {GroupIcon && (
                          <GroupIcon className="h-4 w-4 transition-transform duration-300 group-hover/trigger:scale-110" />
                        )}
                      </div>

                      {/* Label */}
                      <span
                        className={cn(
                          "flex-1 text-left text-sm font-medium transition-colors duration-200",
                          (isOpen || hasActiveItem) && "text-foreground"
                        )}>
                        {nav.title}
                      </span>

                      {/* Animated arrow */}
                      <svg
                        className={cn(
                          "text-muted-foreground h-4 w-4 transition-transform duration-300",
                          isOpen && "rotate-180"
                        )}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Expandable content with smooth animation */}
                    <div
                      className={cn(
                        "overflow-hidden transition-all duration-300 ease-out",
                        isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                      )}>
                      <div className="relative mt-1 ml-6 space-y-0.5 py-1">
                        {/* Connecting line */}
                        <div className="from-border via-border absolute top-2 bottom-2 left-[15px] w-px bg-gradient-to-b to-transparent" />

                        {nav.items.map((item) => {
                          const isActive = pathname === item.href || item.items?.some(sub => pathname === sub.href);
                          const hasSubItems = item.items && item.items.length > 0;

                          // If item has sub-items, render them
                          if (hasSubItems) {
                            return (
                              <div key={item.title} className="space-y-0.5">
                                {/* Parent item label */}
                                <div className="px-2 py-1.5">
                                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    {item.title}
                                  </span>
                                </div>
                                {/* Sub-items */}
                                {item.items?.map((subItem) => {
                                  const isSubActive = pathname === subItem.href;
                                  return (
                                    <Link key={subItem.title} href={subItem.href} className="block">
                                      <div
                                        className={cn(
                                          "group/item relative flex items-center gap-3 rounded-lg py-2 pr-3 pl-8 transition-all duration-200",
                                          "text-muted-foreground",
                                          "hover:bg-muted/50 hover:text-foreground",
                                          isSubActive && "bg-[var(--primary)]/5 text-[var(--primary)]"
                                        )}>
                                        <div
                                          className={cn(
                                            "absolute left-[11px] h-2.5 w-2.5 rounded-full border-2 transition-all duration-200",
                                            isSubActive
                                              ? "border-[var(--primary)] bg-[var(--primary)]"
                                              : "border-border bg-background group-hover/item:border-muted-foreground"
                                          )}
                                        />
                                        <span
                                          className={cn(
                                            "text-sm transition-colors duration-200",
                                            isSubActive && "font-medium"
                                          )}>
                                          {subItem.title}
                                        </span>
                                        <svg
                                          className={cn(
                                            "text-muted-foreground/50 ml-auto h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all duration-200",
                                            "group-hover/item:translate-x-0 group-hover/item:opacity-100",
                                            isSubActive && "text-[var(--primary)]/50"
                                          )}
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                          strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                        </svg>
                                      </div>
                                    </Link>
                                  );
                                })}
                              </div>
                            );
                          }

                          // Regular item without sub-items
                          return (
                            <Link key={item.title} href={item.href} className="block">
                              <div
                                className={cn(
                                  "group/item relative flex items-center gap-3 rounded-lg py-2 pr-3 pl-8 transition-all duration-200",
                                  "text-muted-foreground",
                                  "hover:bg-muted/50 hover:text-foreground",
                                  isActive && "bg-[var(--primary)]/5 text-[var(--primary)]"
                                )}>
                                {/* Connection dot */}
                                <div
                                  className={cn(
                                    "absolute left-[11px] h-2.5 w-2.5 rounded-full border-2 transition-all duration-200",
                                    isActive
                                      ? "border-[var(--primary)] bg-[var(--primary)]"
                                      : "border-border bg-background group-hover/item:border-muted-foreground"
                                  )}
                                />

                                {/* Label */}
                                <span
                                  className={cn(
                                    "text-sm transition-colors duration-200",
                                    isActive && "font-medium"
                                  )}>
                                  {item.title}
                                </span>

                                {/* Hover arrow */}
                                <svg
                                  className={cn(
                                    "text-muted-foreground/50 ml-auto h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all duration-200",
                                    "group-hover/item:translate-x-0 group-hover/item:opacity-100",
                                    isActive && "text-[var(--primary)]/50"
                                  )}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}>
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9 5l7 7-7 7"
                                  />
                                </svg>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </TooltipProvider>
  );
}
