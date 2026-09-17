import Link from "next/link";

function Cancel(){
    return(
            <section className="container-xxl d-flex p-md-5 p-4 flex-column mb-5" id="coworking">
                <div className="col-12 d-flex flex-column">
                    <span className="display-1 text-center">😕</span>

                   <p className="display-6 text-center">
                        Your payment didn't go through.
                   </p>
                   <p className="fs-4 text-center">
                        No booking has been made and you haven't been charged. You can try again below,
                        or if you continue having trouble send us an email at <a href="mailto:workforce@grithub.org.za">workforce@grithub.org.za</a> or <a href="https://wa.me/270630705752">WhatsApp Us</a>
                   </p>

                    <div className="d-flex justify-content-center mt-4">
                        <Link href="/cowork/book" className="btn rounded-pill btn-lg btn-primary">
                            Try again
                        </Link>
                    </div>
                </div>
            </section>
    )
}


export default Cancel;
