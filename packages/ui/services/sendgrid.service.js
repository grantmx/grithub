import sgMail from "@sendgrid/mail"


export default class SendgridService{
    constructor({ to, subject, html }){
        sgMail.setApiKey(process.env.sendgrid_api_key);

        this.options = {
            from: process.env.server_email,
            to,
            subject,
            html
        }
    }

    async send(){
        return await sgMail.send(this.options).then(data => data)
    }
}