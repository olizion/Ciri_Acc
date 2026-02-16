import { useRef } from "react";

/**
 * Returns crystallize animation classes only when data was loading on mount.
 * If React Query had cached data (isLoading=false on mount), no animation.
 */
export function useCrystallize(isLoading: boolean) {
  const hadToLoad = useRef(isLoading);

  return (stagger?: number): string => {
    if (!hadToLoad.current) return "";
    if (stagger !== undefined) {
      return `animate-crystallize-stagger-${stagger}`;
    }
    return "animate-crystallize";
  };
}
