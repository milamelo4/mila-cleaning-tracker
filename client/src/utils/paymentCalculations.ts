export const calculateNetEarnings = (
  amountCharged: number,
  helperPayout: number
) => {
  return Math.max(amountCharged - helperPayout, 0);
};

export const calculateHourlyRate = (
  amountCharged: number,
  helperPayout: number,
  actualHours: number
) => {
  if (actualHours <= 0) {
    return 0;
  }

  const netEarnings = calculateNetEarnings(
    amountCharged,
    helperPayout
  );

  return netEarnings / actualHours;
};

export const getDefaultHelperPayout = (
  amountCharged: number,
  hasHelper: boolean
) => {
  return hasHelper ? amountCharged / 2 : 0;
};