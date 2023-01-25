import { useQuery } from '@tanstack/react-query';
import { hubs } from '../../lib/constants';
import { getCurrentForecast } from '../../services/weather.service';
import clsx from 'clsx';
import WeatherIcon from './WeatherIcon';

import Style from './Weather.module.scss'


function CurrentWeather(){
    const weather = useQuery({
        queryKey: [hubs.george.name +".current_weather"], 
        queryFn: getCurrentForecast,
        retry: false,
        refetchInterval: 3600000,
        refetchOnWindowFocus: false
    })

    if( !weather.data ){
        return null
    }


    return(
        <li className={Style.iconCntr}>
            <WeatherIcon 
                description={weather.data.IconPhrase}
                className={Style.currentIcon} 
            />

            <p className={clsx(Style.text, Style.currentText)}>
                <span className={Style.now}>
                    Now
                </span>

                <span className={Style.nowTemp}>
                    {Math.round(weather?.data?.Temperature?.Value)}&deg;C
                </span>
            </p>
        </li>
    )
}


export default CurrentWeather;