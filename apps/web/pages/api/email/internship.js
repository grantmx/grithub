import StandardEmail from "../../../components/emails/StandardEmail"
import SendgridService from "../../../services/sendgrid.service"
import { render } from 'mjml-react';

export default async function handler(req, res) {
    const { heading, message, to, subject } = req.body;
    
    const { html } = render(StandardEmail({ heading, message }), { validationLevel: 'soft' })

    const sendgrid = new SendgridService({ to, subject, html })


    if( req.method === "POST" ){
        await sendgrid.send()
            .then((data) => {
                res.status(200).json(data)
            })
            .catch((err) => {
                console.log(err)

                res.status(400).json(err)

            })
    }
}