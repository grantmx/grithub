import axios from 'axios'
import { 
    open_weather_api_key, 
    open_weather_url, 
    hubs, 
    accuweather_api_key, 
    accuweather_daily_url, 
    accuweather_hourly_url, 
    accuweather_location_key 
} from '../lib/constants';


// const openWeather = {
//     lat: hubs.george.lat,
//     lon: hubs.george.lon,
//     appid: open_weather_api_key,
//     units: "metric",
//     cnt: 5,
//     exclude: "minutely,hourly,alerts"
// };

const accuweather = {
    apikey: accuweather_api_key,
    language: "en-gb",
    details: false,
    metric: true
};


export async function getCurrentForecast(){
    return await axios({
        method: "GET",
        baseURL: accuweather_hourly_url + accuweather_location_key,
        params: accuweather
    })
    .then(res => res.data[0])
    .catch(err => {
        console.log(err)
    })
}


export async function getForecast(){
    return await axios({
        method: "GET",
        baseURL: accuweather_daily_url +"/"+ accuweather_location_key,
        params: accuweather
    })
    .then(res =>res.data)
    .catch(err => {
        console.log(err)
    })
}