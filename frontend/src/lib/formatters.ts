// NEXUS Finance - Formatting Utilities

export function formatCurrency(amount: number, currency: string = 'COP'): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '$ 0';
  }

  // COP standard representation or USD
  if (currency === 'COP') {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(value: number): string {
  if (isNaN(value) || value === null || value === undefined) {
    return '0.0%';
  }
  return `${value.toFixed(1)}%`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const [year, month, day] = dateString.split('-');
    if (year && month && day) {
      const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return new Intl.DateTimeFormat('es-CO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }).format(d);
    }
    return dateString;
  } catch {
    return dateString;
  }
}
