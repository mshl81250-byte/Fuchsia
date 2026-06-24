export function formatCurrency(amount: number | undefined | null): string {
  if (amount == null) return "0 ر.ي";
  
  // Format with Arabic-Indic numerals
  const formatted = new Intl.NumberFormat('ar-YE', {
    style: 'decimal',
    maximumFractionDigits: 0
  }).format(amount);
  
  return `${formatted} ر.ي`;
}

export function toArabicNumerals(num: number | string): string {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().replace(/[0-9]/g, w => arabicNumerals[+w]);
}
