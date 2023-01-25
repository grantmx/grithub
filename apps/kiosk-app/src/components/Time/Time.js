import { useClock } from "../../custom_hooks/useClock"
import Style from './Time.module.scss';


function Time(){
    const clock = useClock();

    return(
        <div className={Style.block}>
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