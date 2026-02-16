"use client";

import React from "react";
import { motion } from "framer-motion";
import { ChevronRightIcon, SunIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import type { Employee } from "../types";
import { EmployeeDialog } from "./employee-dialog";

interface EmployeeRowProps {
  employee: Employee;
  index: number;
}

export const EmployeeRow = React.memo(function EmployeeRow({ employee, index }: EmployeeRowProps) {
  const initials = employee.name.split(" ").map(n => n[0]).join("");

  return (
    <EmployeeDialog employee={employee}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="group flex items-center gap-4 py-4 border-b last:border-0 cursor-pointer hover:bg-muted/30 -mx-4 px-4 transition-colors"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 font-medium text-[var(--primary)] text-sm">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{employee.name}</p>
            {employee.status === "vacation" && (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger>
                    <SunIcon className="size-4 text-amber-500" />
                  </TooltipTrigger>
                  <TooltipContent>På ferie</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">{employee.position}</p>
        </div>

        <p className="font-medium tabular-nums text-right">
          kr {employee.salary.toLocaleString("nb-NO")}
        </p>

        <ChevronRightIcon className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </motion.div>
    </EmployeeDialog>
  );
});
