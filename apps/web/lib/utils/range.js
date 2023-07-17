/**
 * Creates an array with custom length from a given number range
 * @param {number} start 
 * @param {number} end 
 * @returns array
 */

export default function range(start, end){
    const length = end - start + 1;
    
    return Array.from({ length }, (_, i) => start + i);
}
