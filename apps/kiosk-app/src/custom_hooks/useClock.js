import { useEffect, useMemo, useRef, useState } from "react";


export function useClock(locale = "en-GB"){
    const [ now, setNow ] = useState(0)
    const timer = useRef();


    useEffect(() => {
        timer.current = setInterval(() => {
            const dateNow = Date.now()
            const currentTime = new Date(dateNow)

            setNow(currentTime)
        }, 1000);


        return () => {
            clearInterval(timer.current);
        }

    }, [])



    const clock = useMemo(() => {
        const nowIsh = new Date(now)
        const minutes = nowIsh.getMinutes();
        const minutesFormatted = minutes > 10 ? minutes : `0${minutes}`
        const hours = nowIsh.getHours();

        return{
            time: hours > 12 ? `${hours - 12}:${minutesFormatted} PM` : `${hours}:${minutesFormatted} AM`,
            date: `${new Intl.DateTimeFormat(locale, { weekday: "long" }).format(nowIsh)}, ${nowIsh.getDate()} ${new Intl.DateTimeFormat(locale, { month: "long" }).format(nowIsh)}`
        }

    }, [ now, locale ])


    return { ...clock }
}