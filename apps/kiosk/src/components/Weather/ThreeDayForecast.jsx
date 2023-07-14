import { useQuery } from '@tanstack/react-query';
import { hubs } from '../../lib/constants';
import { getForecast } from '../../services/weather.service';
import WeatherIcon from './WeatherIcon';

import Style from './Weather.module.scss'




function ThreeDayForecast(){
    const weather = useQuery({
        queryKey: [hubs.george.name +".forecast"], 
        queryFn: getForecast,
        retry: false,
        refetchInterval: 7200000,
        refetchOnWindowFocus: false
    })

    if( !weather.data ){
        return null
    }


    return(
        <>
            {weather.data.DailyForecasts.map((daily, i) => {
                // if today or greater than 3 days from now
                if( i === 0 || i > 3 ){ return null }

                const nowIsh = new Date(daily.Date)

                return(
                    <li className={Style.iconCntr} key={daily.Date}>
                        <WeatherIcon description={daily.Day.IconPhrase} />

                        <p className={Style.text}>
                            <span className={Style.day}>
                                {new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(nowIsh)}
                            </span>
    
                            <span className={Style.tempRange}>
                                {Math.round(daily.Temperature.Maximum.Value)}&deg; / {Math.round(daily.Temperature.Minimum.Value)}&deg;C
                            </span>
                        </p>
                    </li>
                )
            })}
        </>
    )
}


export default ThreeDayForecast;