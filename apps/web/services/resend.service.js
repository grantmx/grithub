import { Resend } from "resend"


export default class ResendService{
    constructor({ to, subject, html }){
        this.resend = new Resend(process.env.resend_api_key);

        this.options = {
            from: process.env.server_email,
            to,
            subject,
            html
        }
    }

    async send(){
        return await this.resend.emails.send(this.options).then(data => data)
    }
}
