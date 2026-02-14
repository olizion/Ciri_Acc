import { LogOut, Settings, User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

export default function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar>
          <AvatarImage src={`/images/avatars/01.png`} alt="Bruker" />
          <AvatarFallback className="rounded-lg">HB</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-60" align="end">
        <DropdownMenuLabel className="p-0">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar>
              <AvatarImage src={`/images/avatars/01.png`} alt="Bruker" />
              <AvatarFallback className="rounded-lg">HB</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">Min Bedrift AS</span>
              <span className="text-muted-foreground truncate text-xs">admin@minbedrift.no</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/pages/profile">
              <User />
              Profil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/pages/settings">
              <Settings />
              Innstillinger
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LogOut />
          Logg ut
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
