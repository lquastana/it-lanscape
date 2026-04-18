import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function toGiBRounded(mib) {
  const n = typeof mib === 'number' ? mib : parseFloat(mib);
  if (Number.isNaN(n)) return mib;
  return `${Math.round(n / 1024)} Go`;
}

export function prettyLabel(key) {
  switch (key) {
    case 'MemoryMiB': return 'MemoryGiB';
    case 'TotalDiskCapacityMiB': return 'TotalDiskCapacityGiB';
    default: return key;
  }
}

export function prettyValue(key, value) {
  if (key === 'MemoryMiB' || key === 'TotalDiskCapacityMiB') {
    return toGiBRounded(value);
  }
  return Array.isArray(value) ? value.join(', ') : value;
}
