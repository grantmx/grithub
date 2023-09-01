import axios from "axios"
import GeneralPage from "components/layout/GeneralPage";
import Link from "next/link";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { celebrationTime } from "lib/utils/celebrationTime";



function InternshipSuccess(){
    const searchParams = useSearchParams()
    const firstName = searchParams.get('first_name')
    const email = searchParams.get('email')

    useEffect(() => {
		celebrationTime()

	}, [])

    useEffect(() => {
        if( email && firstName ){
            axios.post("/api/email/internship", {
                subject: `Thank you for your GRIT Internship application, ${firstName}! 🎉`,
                to: email,
                heading: `Hey, ${firstName}! 👋`,
                message: `
                    <p>Your application submission to the GRIT Internship program was successful.  Thanks!</p>
                    <p>If you are a finalist, we will be in contact with you regarding follow-up and additional information. All the best, and thank you again for your interest.</p>
                    <p>- Marshall</p>
                `
            })    
        }

    }, [ email, firstName ])


    return(
        <GeneralPage 
            title="Application Received!"
            centerTitle
		>
            <section className="container-xxl d-flex p-md-5 p-4 flex-column mb-5" id="coworking">
                <div className="col-12 d-flex flex-column">
                    <span className="display-1 text-center">🥳</span>

                    <p className="display-6 text-center">
                        You will receive a confirmation email shortly.
                    </p>
                    <p className="fs-4 text-center">
                        If you have any questions regarding your application<br/> send us an email at <a href="mailto:workforce@grithub.org.za">workforce@grithub.org.za</a> or <a href="#" onClick={(e) =>{ e.preventDefault(); window.location.href="https://wa.me/270630705752"; }}>WhatsApp Us</a>
                    </p>

                    <p className="fs-5 text-center">
                        If you haven't received an email, be sure to double check your SPAM/JunK folder. Continue reading about the <Link href="/programs/internship">GRIT Internship &rsaquo;</Link>
                    </p>
                </div>
            </section>
        </GeneralPage>
    )
}


export default InternshipSuccess;