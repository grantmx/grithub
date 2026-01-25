import Link from "next/link";
import Success from "./Success";
import { Suspense } from "react";


async function InternshipSuccess(){
    return(
        <>
            <Suspense>
                <Success />
            </Suspense>

            <section className="container-xxl d-flex p-md-5 p-4 flex-column mb-5" id="coworking">
                <div className="col-12 d-flex flex-column">
                    <span className="display-1 text-center">🥳</span>

                    <p className="display-6 text-center">
                        You will receive a confirmation email shortly.
                    </p>
                    <p className="fs-4 text-center">
                        If you have any questions regarding your application<br/> send us an email at <a href="mailto:workforce@grithub.org.za">workforce@grithub.org.za</a> or <a href="https://wa.me/270630705752">WhatsApp Us</a>
                    </p>

                    <p className="fs-5 text-center">
                        If you haven't received an email, be sure to double check your SPAM or JUNK folder. <br/>Continue reading about the <Link href="/incubation/competition">Innovative Ideas Competition &rsaquo;</Link>
                    </p>
                </div>
            </section>
        </>
    )
}


export default InternshipSuccess;