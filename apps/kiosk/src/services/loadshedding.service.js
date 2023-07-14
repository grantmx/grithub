import axios from 'axios'
import { eskomSePush_key } from '../lib/constants'


export async function getLoadSheddingEvents({ id }){
    return axios({
        method: "GET",
        baseURL: "https://developer.sepush.co.za/business/2.0/area",
        headers: {
            token: eskomSePush_key
        },
        params: {
            id,
            test: "future",
        }
    })
}