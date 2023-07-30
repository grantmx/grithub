import axios from "axios"
import GeneralPage from "components/layout/GeneralPage";
import Link from "next/link";
import { useEffect } from "react";


function InternshipSuccess(){

    useEffect(() => {
        axios.post("/api/email/internship", {
            subject: "test",
            to: "grantmx@gmail.com",
            html: "<h1>test</h1>"
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