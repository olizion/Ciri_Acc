// ============================================================================
// HELPERS
// ============================================================================

export function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "nå";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min siden`;
  const hours = Math.floor(minutes / 60);
  return `${hours} t siden`;
}
