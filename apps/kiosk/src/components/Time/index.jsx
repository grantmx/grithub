import { useClock } from "../../custom_hooks/useClock"
import Style from './Time.module.scss';


function Time(){
    const clock = useClock({ locale: "en-US", timeZone: "CAT" });
    const estClock = useClock({ locale: "en-US", timeZone: "EST" });

    return(
        <div className={Style.block}>
             <span className={Style.timezone}>
                {estClock.time} EST &nbsp;—&nbsp; New York, NY
            </span>
            <time className={Style.clock}>
                {clock.time}
            </time>

           
            
            <time className={Style.date}>
                {clock.date}
            </time>
        </div>
    )
}


export default Time