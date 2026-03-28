"use client";

import { useState, useCallback, useMemo } from "react";
import { employees } from "../../data/employees";
import type { FeriepengerConfig, ComputedEmployeeRate } from "../types";

const STORAGE_KEY = "ciri-feriepenger-config";

function loadConfig(): FeriepengerConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FeriepengerConfig;
  } catch {
    return null;
  }
}

function persistConfig(config: FeriepengerConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/** Base rate: 10.2 % (law minimum) or 12 % (tariffavtale with 5-week vacation) */
const RATE_STANDARD = 0.102;
const RATE_EXTENDED = 0.12;

export function useFeriepengerConfig() {
  const [config, setConfig] = useState<FeriepengerConfig | null>(loadConfig);

  const saveConfig = useCallback((newConfig: FeriepengerConfig) => {
    persistConfig(newConfig);
    setConfig(newConfig);
  }, []);

  const resetConfig = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setConfig(null);
  }, []);

  const computedRates: ComputedEmployeeRate[] = useMemo(() => {
    if (!config) return [];

    return employees.map((emp) => {
      const isOver60 = config.employeesOver60.includes(emp.id);

      if (isOver60) {
        return {
          employeeId: emp.id,
          rate: RATE_EXTENDED,
          rateLabel: "12 %",
          reason: "60 år eller eldre — ekstra ferieuke etter loven",
        };
      }

      if (config.hasTariffavtale) {
        return {
          employeeId: emp.id,
          rate: RATE_EXTENDED,
          rateLabel: "12 %",
          reason: "Tariffavtale med 5 ukers ferie",
        };
      }

      return {
        employeeId: emp.id,
        rate: RATE_STANDARD,
        rateLabel: "10,2 %",
        reason: "Lovpålagt minimum — 4 uker + 1 dag",
      };
    });
  }, [config]);

  /** Weighted average rate across all employees */
  const averageRate = useMemo(() => {
    if (computedRates.length === 0) return RATE_EXTENDED; // fallback
    const totalSalary = employees.reduce((s, e) => s + e.salary, 0);
    if (totalSalary === 0) return RATE_EXTENDED;
    const weighted = employees.reduce((sum, emp) => {
      const cr = computedRates.find((r) => r.employeeId === emp.id);
      return sum + emp.salary * (cr?.rate ?? RATE_EXTENDED);
    }, 0);
    return weighted / totalSalary;
  }, [computedRates]);

  return {
    config,
    isConfigured: config !== null,
    saveConfig,
    resetConfig,
    computedRates,
    averageRate,
  };
}
