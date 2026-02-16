"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  SunIcon,
  MailIcon,
  PhoneIcon,
  PencilIcon
} from "lucide-react";
import type { Employee } from "../types";
import { payslipHistory } from "../data/payslips";
import { PayslipListItem } from "./payslip-list-item";

interface EmployeeDialogProps {
  employee: Employee;
  children: React.ReactNode;
}

export function EmployeeDialog({ employee, children }: EmployeeDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const netSalary = employee.salary * (1 - employee.taxRate / 100);
  const arbeidsgiveravgift = employee.salary * 0.141;
  const otp = employee.salary * 0.02;
  const totalCost = employee.salary + arbeidsgiveravgift + otp;

  const initials = employee.name.split(" ").map(n => n[0]).join("");
  const employmentYears = Math.floor((new Date().getTime() - new Date(employee.startDate).getTime()) / (1000 * 60 * 60 * 24 * 365));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="pb-4">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 font-display text-lg font-bold text-[var(--primary)]">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="font-display text-xl flex items-center gap-2">
                {employee.name}
                {employee.status === "vacation" && (
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
                    <SunIcon className="mr-1 size-3" />
                    På ferie
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {employee.position} · {employee.employmentType === "fast" ? "Fast ansatt" : "Deltid"} · {employmentYears > 0 ? `${employmentYears} år i bedriften` : "Nyansatt"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 text-sm">
              <MailIcon className="size-4 text-muted-foreground" />
              <span className="truncate">{employee.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <PhoneIcon className="size-4 text-muted-foreground" />
              <span>{employee.phone}</span>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-3">Lønnsdetaljer</h4>
            <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bruttolønn</span>
                <span className="font-medium tabular-nums">kr {employee.salary.toLocaleString("nb-NO")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Skattetrekk ({employee.taxRate}%)</span>
                <span className="tabular-nums text-red-600 dark:text-red-400">- kr {Math.round(employee.salary * employee.taxRate / 100).toLocaleString("nb-NO")}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-medium">Utbetalt</span>
                <span className="font-display text-lg font-bold tabular-nums">kr {Math.round(netSalary).toLocaleString("nb-NO")}</span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Arbeidsgiveravgift</p>
                <p className="font-medium tabular-nums">kr {Math.round(arbeidsgiveravgift).toLocaleString("nb-NO")}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">OTP (2%)</p>
                <p className="font-medium tabular-nums">kr {Math.round(otp).toLocaleString("nb-NO")}</p>
              </div>
            </div>

            <p className="mt-3 text-xs text-muted-foreground text-center">
              Total månedskostnad: <span className="font-medium text-foreground">kr {Math.round(totalCost).toLocaleString("nb-NO")}</span>
            </p>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Feriedager</h4>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-2xl font-bold">{employee.vacationDays.total - employee.vacationDays.used}</span>
                <span className="text-sm text-muted-foreground">av {employee.vacationDays.total} gjenstår</span>
              </div>
              <Progress
                value={(employee.vacationDays.used / employee.vacationDays.total) * 100}
                className="h-1.5 mt-2"
              />
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Feriepenger</h4>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-2xl font-bold">kr {(employee.feriepenger / 1000).toFixed(0)}k</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Utbetales juni 2026</p>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-3">Siste lønnslipper</h4>
            <div className="space-y-2">
              {payslipHistory.map((slip) => (
                <PayslipListItem key={slip.id} slip={slip} />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" size="sm">
            <PencilIcon className="mr-2 size-4" />
            Rediger
          </Button>
          <DialogClose asChild>
            <Button size="sm">Lukk</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
