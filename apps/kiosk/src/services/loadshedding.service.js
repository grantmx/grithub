import axios from 'axios'

export async function getLoadSheddingEvents({ id }){
    return axios({
        method: "GET",
        baseURL: "https://developer.sepush.co.za/business/2.0/area",
        headers: {
            token: process.env.eskomSePush_key
        },
        params: {
            id,
            test: "future",
        }
    })
}