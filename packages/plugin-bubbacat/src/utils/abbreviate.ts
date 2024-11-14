export function abbreviateNumber(number: number) {
    return Intl.NumberFormat('en-US', {
        notation: "compact",
        maximumFractionDigits: 1
    }).format(number);
}

export function unabbreviateNumber(shorthand: string) {
    const units = {
        K: 1000,
        M: 1000000,
        B: 1000000000,
        T: 1000000000000
    };

    const unit = shorthand.slice(-1).toUpperCase();
    const number = parseFloat(shorthand.slice(0, -1));

    return number * ((units as any)[unit] || 1);
}