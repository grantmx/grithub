export default async function handler(req, res){
    if( req.method === "POST" ){
        const response = await fetch("https://payments.yoco.com/api/checkouts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.yoco_secret_key}`
            },
            body: JSON.stringify(req.body),
        })

        const data = await response.json()

        res.status(200).json(data.redirectUrl)
    }
}