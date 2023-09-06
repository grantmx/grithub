/**
 * Removes ALL spaces from a string
 * @param {String} string 
 * @returns a string with no spaces
 */

export default function removeSpaces(string = ""){
    return string.replace(/\s/g, '');
}
