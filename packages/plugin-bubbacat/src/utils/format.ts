export function formatNumber(number: number) {
    const formatter = new Intl.NumberFormat('de-DE');

    return formatter.format(Math.round(number))
}