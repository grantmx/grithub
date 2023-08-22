import Style from "./Loadshedding.module.scss";
import { hubs } from '../../lib/constants';
// import { useEffect } from "react";
// import { getLoadSheddingEvents } from "../../services/loadshedding.service";


function LoadsheddingForecast(){

    // useEffect(() => {
    //     getLoadSheddingEvents({ id: hubs.george.eskomSePush_area_id })

    // }, [])
    
    return(
        <div className={Style.block}>
            <svg className={Style.locationIcon} viewBox="0 0 24 24">
                <path d="M21 3l-7.547 18h-0.984l-2.625-6.844-6.844-2.625v-0.984z"></path>
            </svg>

            {hubs.george.name}
        </div>
    )
}


export default LoadsheddingForecast;