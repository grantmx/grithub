/**
 * Format USD Price
 *  - supports decimal place if the number has it, otherwise we don't use it.
 * @param {Integer} price 
 * @returns formatted price
 */

export default function formatPrice(price){
    const newPrice = parseFloat(price);

    return newPrice.toLocaleString('en-ZA', {
        style: 'currency',
        currency: 'ZAR',
        minimumFractionDigits: Number.isInteger(newPrice) ? 0 : 2,
        maximumFractionDigits: 2,
    });
};


