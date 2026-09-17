import dayjs from "dayjs";

// South African public holidays as gazetted under the Public Holidays Act 36 of 1994.
// Good Friday and Family Day move with Easter each year - computed via the
// Anonymous Gregorian (Meeus/Jones/Butcher) algorithm rather than hardcoded.
function getEasterSunday(year){
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;

    return dayjs(`${year}-${month}-${day}`, "YYYY-M-D");
}


const FIXED_HOLIDAYS = [
    "01-01", // New Year's Day
    "03-21", // Human Rights Day
    "04-27", // Freedom Day
    "05-01", // Workers' Day
    "06-16", // Youth Day
    "08-09", // National Women's Day
    "09-24", // Heritage Day
    "12-16", // Day of Reconciliation
    "12-25", // Christmas Day
    "12-26", // Day of Goodwill
];


function getPublicHolidays(year){
    const easterSunday = getEasterSunday(year);

    const holidays = [
        ...FIXED_HOLIDAYS.map(monthDay => dayjs(`${year}-${monthDay}`, "YYYY-MM-DD")),
        easterSunday.subtract(2, "day"), // Good Friday
        easterSunday.add(1, "day"), // Family Day
    ];

    // when a public holiday falls on a Sunday, the following Monday is also a public holiday
    const sundayShifts = holidays
        .filter(holiday => holiday.day() === 0)
        .map(holiday => holiday.add(1, "day"));

    return [ ...holidays, ...sundayShifts ];
}


export function isPublicHoliday(dateLike){
    const date = dayjs(dateLike);
    if( !date.isValid() ) return false;

    return getPublicHolidays(date.year()).some(holiday => holiday.isSame(date, "day"));
}


export function isWeekend(dateLike){
    const date = dayjs(dateLike);
    if( !date.isValid() ) return false;

    const day = date.day();
    return day === 0 || day === 6;
}
