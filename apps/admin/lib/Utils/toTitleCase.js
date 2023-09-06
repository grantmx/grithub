/**
 * Makes a string Title Case
 * https://stackoverflow.com/questions/196972/convert-string-to-title-case-with-javascript
 * @param {String} str 
 * @returns - A Title Case String
 */

export default function toTitleCase(str = "") {
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
    );
}
