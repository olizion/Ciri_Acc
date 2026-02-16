export const formatNumber = (num: number) => {
  return num.toLocaleString("nb-NO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};
