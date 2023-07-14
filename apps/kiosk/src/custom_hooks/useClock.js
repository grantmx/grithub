import { useEffect, useMemo, useRef, useState } from "react";


export function useClock({ 
    locale = "en-GB", 
    timeZone = "CAT" 
}){
    const [ now, setNow ] = useState(0)
    const timer = useRef();
    const [ timeZoneLocale, setTimeZone ] = useState("Africa/Johannesburg")


    useEffect(() => {
        switch(timeZone){
            case "EST": 
                setTimeZone("America/New_York")
                break;

            default: 
                setTimeZone("Africa/Johannesburg")
        }
        
        timer.current = setInterval(() => {
            const dateNow = Date.now()
            const currentTime = new Date(dateNow)

            setNow(currentTime)

        }, 1000);


        return () => {
            clearInterval(timer.current);
        }

    }, [ timeZone ])



    const clock = useMemo(() => {
        const nowIsh = new Date(now);

        const tzTime = new Date(nowIsh).toLocaleString(locale, { timeZone: timeZoneLocale }).split(",")
        const time = tzTime[1].trim().split(":")
        const minutes = time[1];
        const hours = time[0];

        return{
            time: hours > 12 ? `${hours - 12}:${minutes} PM` : `${Math.round(hours)}:${minutes} AM`,
            raw: { 
                minutes, 
                hours 
            },
            date: `${new Intl.DateTimeFormat(locale, { weekday: "long" }).format(nowIsh)}, ${nowIsh.getDate()} ${new Intl.DateTimeFormat(locale, { month: "long" }).format(nowIsh)}`
        }

    }, [ now, locale, timeZoneLocale ])


    return { ...clock }
}