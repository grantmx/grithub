import NodemailerService from "../../../services/nodemailer.service"
import SendgridService from "../../../services/sendgrid.service"



export default async function handler(req, res) {
    const sendgrid = new SendgridService({ ...req.body })

    if( req.method === "POST" ){
        await sendgrid.send()
            .then((data) => {
                console.log(data)
                res.status(200).json(data)
            })
            .catch((err) => {
                console.log(err)

                res.status(400).json(err)

            })
            
       
    }
}