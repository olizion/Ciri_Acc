export const formatNumber = (num: number, compact = false) => {
  if (compact && Math.abs(num) >= 1000) {
    return (num / 1000).toFixed(0) + "k";
  }
  return num.toLocaleString("nb-NO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

export const getYearTotal = (måneder: number[]) => måneder.reduce((sum, val) => sum + val, 0);
