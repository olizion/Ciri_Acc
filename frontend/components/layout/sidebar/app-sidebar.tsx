"use client";

import * as React from "react";
import { useEffect } from "react";
import { ChevronsUpDown, Building2Icon, PlusIcon, CheckIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useIsTablet } from "@/hooks/use-mobile";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar";
import { NavMain } from "@/components/layout/sidebar/nav-main";
import { NavUser } from "@/components/layout/sidebar/nav-user";
import { ScrollArea } from "@/components/ui/scroll-area";
import CiriLogo from "@/components/layout/ciri-logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const companies = [
  { id: "1", name: "Mitt Konsulentselskap AS", orgNr: "123 456 789", isActive: true },
  { id: "2", name: "Holdingselskap AS", orgNr: "987 654 321", isActive: false }
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { setOpen, setOpenMobile, isMobile } = useSidebar();
  const isTablet = useIsTablet();
  const [selectedCompany, setSelectedCompany] = React.useState(companies[0]);

  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [pathname]);

  useEffect(() => {
    setOpen(!isTablet);
  }, [isTablet]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="hover:text-foreground h-12 group-data-[collapsible=icon]:px-0! hover:bg-[var(--primary)]/5">
                  <CiriLogo size="sm" />
                  <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden">
                    <span className="font-display text-foreground text-sm font-semibold">
                      {selectedCompany.name.length > 20
                        ? selectedCompany.name.slice(0, 20) + "..."
                        : selectedCompany.name}
                    </span>
                    <span className="text-muted-foreground text-xs">{selectedCompany.orgNr}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="mt-2 w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-xl"
                side={isMobile ? "bottom" : "right"}
                align="start"
                sideOffset={8}>
                <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                  Dine selskaper
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {companies.map((company) => (
                  <DropdownMenuItem
                    key={company.id}
                    className="flex items-center gap-3 py-3"
                    onClick={() => setSelectedCompany(company)}>
                    <div className="bg-primary/10 flex size-10 items-center justify-center rounded-lg">
                      <Building2Icon className="text-primary size-5" />
                    </div>
                    <div className="flex flex-1 flex-col">
                      <span className="text-sm font-medium">{company.name}</span>
                      <span className="text-muted-foreground text-xs">{company.orgNr}</span>
                    </div>
                    {selectedCompany.id === company.id && (
                      <CheckIcon className="text-primary size-4" />
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center gap-3 py-3">
                  <div className="border-primary/30 flex size-10 items-center justify-center rounded-lg border-2 border-dashed">
                    <PlusIcon className="text-primary size-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Legg til selskap</span>
                    <span className="text-muted-foreground text-xs">Koble til Brønnøysund</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="h-full">
          <NavMain />
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter>
        {/* Årsregnskap Readiness Widget */}
        <Card className="gap-3 overflow-hidden border-[var(--primary)]/20 bg-gradient-to-br from-[var(--primary)]/5 to-transparent py-4 group-data-[collapsible=icon]:hidden">
          <CardHeader className="px-3 pb-0">
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Årsregnskap 2025</span>
              <span className="text-primary font-display text-lg">87%</span>
            </CardTitle>
            <CardDescription className="text-xs">Klar til innsending</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-3">
            <Progress value={87} className="h-2" />
            <Button size="sm" className="w-full" variant="outline">
              Se detaljer
            </Button>
          </CardContent>
        </Card>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
