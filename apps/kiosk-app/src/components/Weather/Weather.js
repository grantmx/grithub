import CurrentWeather from './CurrentWeather';
import ThreeDayForecast from './ThreeDayForecast';
import { hubs } from '../../lib/constants';

import Style from './Weather.module.scss'



function Weather(){
    return(
        <section className={Style.block}>
            <div className={Style.location}>
                <svg className={Style.locationIcon} viewBox="0 0 24 24">
                    <path d="M21 3l-7.547 18h-0.984l-2.625-6.844-6.844-2.625v-0.984z"></path>
                </svg>

                {hubs.george.name}
            </div>

            <ul className={Style.forecast}>
                <CurrentWeather />
                <ThreeDayForecast />
            </ul>
        </section>
    )
}


export default Weather;