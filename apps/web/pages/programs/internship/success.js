import axios from "axios"
import GeneralPage from "components/layout/GeneralPage";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";



function InternshipSuccess(){
    const router = useRouter()

    useEffect(() => {
        axios.post("/api/email/internship", {
            subject: `${router?.query?.first_name}, thank you for your GRIT Internship Application!`,
            to: router?.query?.email,
            heading: `Hey, ${router?.query?.first_name}! 👋`,
            message: `
                <p>Thank you for your application submission to the GRIT Internship program.</p>
                <p>If you are a finalist, our GRIT Hub staff will be in contact with you regarding followup and additional information.</p>
                <p>All the best to you, and thank you again for your interest.</p>
            `
        })

    }, [])


    return(
        <GeneralPage 
            title="Application Received!"
            centerTitle
		>
            <section className="container-xxl d-flex p-md-5 p-4 flex-column mb-5" id="coworking">
                <div className="col-12 d-flex flex-column">
                    <span className="display-1 text-center">🥳</span>

                    <p className="display-6 text-center">
                        You will receive a confirmation shortly.
                    </p>
                    <p className="fs-4 text-center">
                        If you have any questions regarding your application<br/> send us an email at <a href="mailto:workforce@grithub.org.za">workforce@grithub.org.za</a> or <a href="#" onClick={(e) =>{ e.preventDefault(); window.location.href="https://wa.me/270630705752"; }}>WhatsApp Us</a>
                    </p>

                    <p className="fs-5 text-center">Continue reading about the <Link href="/programs/internship">GRIT Internship &rsaquo;</Link></p>
                </div>
            </section>
        </GeneralPage>
    )
}


export default InternshipSuccess;