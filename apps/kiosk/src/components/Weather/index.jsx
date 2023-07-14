import CurrentWeather from './CurrentWeather';
import ThreeDayForecast from './ThreeDayForecast';
import LoadsheddingForecast from '../LoadsheddingForecast';

import Style from './Weather.module.scss'



function Weather(){
    return(
        <section className={Style.block}>
            <LoadsheddingForecast />

            <ul className={Style.forecast}>
                <CurrentWeather />
                <ThreeDayForecast />
            </ul>
        </section>
    )
}


export default Weather;