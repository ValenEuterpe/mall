export function formatShopNumber(num: number, digits: number = 2): string {
    return num.toString().padStart(digits, "0");
}