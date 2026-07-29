export function getConfig(key: string, defaultValue: any = null): any {
  if (typeof window !== 'undefined' && (window as any).electronConfig) {
    const val = (window as any).electronConfig.get(key);
    if (val !== undefined && val !== null) {
      return val;
    }
  }
  
  const localVal = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  const sessionVal = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(key) : null;
  const targetVal = localVal !== null ? localVal : sessionVal;
  if (targetVal !== null) {
    try {
      return JSON.parse(targetVal);
    } catch (e) {
      return targetVal;
    }
  }
  
  return defaultValue;
}

export function setConfig(key: string, value: any): void {
  if (typeof window !== 'undefined' && (window as any).electronConfig) {
    (window as any).electronConfig.set(key, value);
  }
  
  if (typeof localStorage !== 'undefined') {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, stringValue);
  }
}

export function getAllConfig(): Record<string, any> {
  if (typeof window !== 'undefined' && (window as any).electronConfig) {
    return (window as any).electronConfig.getAll();
  }
  return {};
}

export function getVatConfig(): { enabled: boolean; percentage: number } {
  const rawEnabled = getConfig('vatEnabled');
  const enabled = rawEnabled !== null && rawEnabled !== undefined
    ? (rawEnabled === true || rawEnabled === 'true')
    : true;

  const rawPercent = getConfig('vatPercentage');
  let percentage = 15;
  if (rawPercent !== null && rawPercent !== undefined && rawPercent !== '') {
    const parsed = parseFloat(rawPercent);
    if (!isNaN(parsed)) {
      percentage = Math.max(0, parsed);
    }
  }
  return { enabled, percentage };
}

export function setVatConfig(enabled: boolean, percentage: number): void {
  setConfig('vatEnabled', enabled);
  setConfig('vatPercentage', percentage);
}
