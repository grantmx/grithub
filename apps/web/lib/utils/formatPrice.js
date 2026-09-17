/**
 * Format USD Price
 *  - supports decimal place if the number has it, otherwise we don't use it.
 * @param {Integer} price 
 * @returns formatted price
 */

export default function formatPrice(price){
    const newPrice = parseFloat(price);
    const hasCents = Math.round(newPrice * 100) % 100 !== 0;

    return newPrice.toLocaleString('en-ZA', {
        style: 'currency',
        currency: 'ZAR',
        minimumFractionDigits: hasCents ? 2 : 0,
        maximumFractionDigits: 2,
    });
};


