import Image from "next/image";
import intern from "@/public/assets/coworkers-working-office.jpg"
import Style from "../internship.module.scss"
import Link from "next/link";


export const metadata = {
    title: "The GRIT Internship Application",
    description: "Apply for The GRIT Internship program.",
}


function InternshipApplication(){

    return(
        <section className="container-xxl d-flex p-md-5 p-4 flex-column mb-5" id="internship">
            <div className="col-12 d-flex flex-column flex-md-row mt-3">
                <div className="col-12 col-md-8 pe-md-5 mb-5">
                    <iframe 
                        className="airtable-embed" 
                        src="https://airtable.com/embed/appJBk9nhVZawihCj/paguZESANMJPRLmKj/form" 
                        width="100%" 
                        height="1000" 
                        style={{ background: "transparent", border: "none" }}
                    />
                </div>

                <div className="col-4">
                    <Image 
                        width={300}
                        height={200}
                        alt="internship"
                        src={intern.src}
                        className={Style.image}
                    />

                    <div className="col-md-12 p-3 shadow-lg">
                        <small>By submitting this form I understand that the information I provide will be used in accordance with GRIT Hub's applicant and candidate <Link href="/privacy" target="_blank">privacy policy</Link>. I consent to the processing of my information as described in that policy including that, in limited circumstances, GRIT Hub may share my contact information with trusted third parties, to assist in certain phases of the hiring process (such as conducting background checks).</small>
                    </div>
                </div>
        </div>


        </section>
    )
}


export default InternshipApplication;