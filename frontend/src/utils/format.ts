export const toNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value) || 0;
  return 0;
};

export const formatMoney = (value: any, decimals: number = 2): string => {
  return toNumber(value).toFixed(decimals);
};

export const formatMoneyWithSign = (value: any, decimals: number = 2): string => {
  const num = toNumber(value);
  const sign = num >= 0 ? '+' : '-';
  return `${sign}¥${Math.abs(num).toFixed(decimals)}`;
};
