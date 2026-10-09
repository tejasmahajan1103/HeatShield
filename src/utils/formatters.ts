export const formatTemp = (tempC: number, unit: 'C' | 'F' = 'C'): string => {
  if (unit === 'F') {
    const f = (tempC * 9) / 5 + 32;
    return `${Math.round(f)}°F`;
  }
  return `${tempC.toFixed(1)}°C`;
};

export const formatDistance = (distKm: number, unit: 'km' | 'miles' = 'km'): string => {
  if (unit === 'miles') {
    const m = distKm * 0.621371;
    return `${m.toFixed(1)} mi`;
  }
  return `${distKm.toFixed(1)} km`;
};

export const getRiskBadgeColor = (level: string): { bg: string; text: string; border: string } => {
  switch (level) {
    case 'Low':
      return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' };
    case 'Moderate':
      return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' };
    case 'High':
      return { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' };
    case 'Extreme':
      return { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' };
    default:
      return { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' };
  }
};
