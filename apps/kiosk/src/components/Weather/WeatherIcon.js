import { useEffect, useState } from "react";
import { weather_icons } from "../../lib/constants";
import clsx from "clsx";

import Style from './Weather.module.scss'

function WeatherIcon({ description, className = "" }){
    const [icon, setIcon] = useState(null)


    useEffect(() => {
        switch(description){
            case "overcast clouds":
            case "mist":
            case 'Dreary':
                setIcon(weather_icons.hazy); 
                break;

            case "scattered clouds":
            case "Cloudy":
                setIcon(weather_icons.cloudy); 
                break;

            case "few clouds":
            case 'Partly sunny':
                setIcon(weather_icons.partly_cloudy); 
                break;

            case "moderate rain":
            case "shower rain":
            case "light rain":
            case "Mostly cloudy w/ showers":
            case "Showers":
                setIcon(weather_icons.light_rain); 
                break;

            case "thunderstorm":
                setIcon(weather_icons.thunder_storm); 
                break;

            default: 
                setIcon(weather_icons.clear);
                return;
        }

    }, [ description ])


    return(
        <svg 
            dangerouslySetInnerHTML={{ __html: icon }} 
            viewBox="0 0 32 32"
            className={clsx(className, Style.icon)}
        />
    )

}


export default WeatherIcon;