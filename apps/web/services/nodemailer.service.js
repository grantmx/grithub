import nodemailer from "nodemailer"


export default function NodemailerService({ to, subject, html }){
    return new Promise((resolve, reject) => {
        const transporter = nodemailer.createTransport({
            host: 'smtp.office365.com',
            secure: true,
            port: 443,
            requireTLS: true,
            tls: {
                ciphers: "SSLv3",
                rejectUnauthorized: false,
            },
            auth: {
                user: process.env.server_email,
                pass: process.env.server_email_password,
            },
            debug: true,
            logger: true,
        });

        const options = {
            from: process.env.server_email,
            to,
            subject,
            html
        }


        transporter.sendMail(options, (error, info) => {
            if( error ){
                reject({ message: "Something happened.", error })

            }else{
                resolve({ message: "Success! Mail Sent", ...info })
            }
        })
    })
}