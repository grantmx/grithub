import axios from "axios";


export default async function handler(req, res) {
    return await axios({
        method: "GET",
        baseURL: "https://developer.sepush.co.za/business/2.0/area",
        headers: {
            token: process.env.eskomSePush_key
        },
        params: {
            id,
            test: "future",
        }
    }).then(data => {
        res.status(200).json({ data })
    })

}