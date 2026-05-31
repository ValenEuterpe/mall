export function formatAmdPrice(
  price: number | string,
  locale: string = "en"
): string {
  const numericPrice =
    typeof price === "number" ? price : Number.parseFloat(price);

  const safePrice = Number.isFinite(numericPrice) ? numericPrice : 0;

  const formattedNumber = new Intl.NumberFormat(locale, {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(safePrice);

  return `${formattedNumber} ֏`;
}
