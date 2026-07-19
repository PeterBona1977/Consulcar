export const parseNumber = (v: any) => {
  let s = String(v || '').replace(/\s|€/g, '');
  if (s.includes(',') && s.includes('.')) {
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (s.includes(',')) {
    const parts = s.split(',');
    if (parts.length > 2 || parts[parts.length - 1].length === 3) s = s.replace(/,/g, '');
    else s = s.replace(',', '.');
  } else if (s.includes('.')) {
    const parts = s.split('.');
    if (parts.length > 2 || parts[parts.length - 1].length === 3) s = s.replace(/\./g, '');
  }
  return parseFloat(s) || 0;
};

export const formatPriceStr = (v: any) => {
  const num = parseNumber(v);
  if (num === 0 && v) return v;
  const formatted = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num);
  return `${formatted} €`;
};

export const calculateVehicleTotal = (vehicle: any) => {
  const base = parseNumber(vehicle.price);
  const costs = vehicle.specs?.costs || [];
  const totalCosts = costs.reduce((acc: number, c: any) => acc + parseNumber(c.value), 0);
  return base + totalCosts;
};

export const getVehicleFinalPriceStr = (vehicle: any) => {
  return formatPriceStr(calculateVehicleTotal(vehicle));
};
