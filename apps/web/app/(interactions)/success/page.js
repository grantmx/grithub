"use client"

import { useEffect } from "react";
import { celebrationTime } from "../../../lib/utils/celebrationTime";


function PurchaseSuccess(){
    useEffect(() => {
        celebrationTime()
        
    }, [])

    return(
        <section className="container-xxl d-flex p-md-5 p-4 flex-column mb-5" id="coworking">
            <div className="col-12 d-flex flex-column">
                <span className="display-1 text-center">🥳</span>

                <p className="display-6 text-center">
                    Thank you for your purchase!
                </p>
                <p className="fs-4 text-center">
                    If you have any questions regarding your purchase<br/> send us an email at <a href="mailto:workforce@grithub.org.za">workforce@grithub.org.za</a> or <a href="#" onClick={(e) =>{ e.preventDefault(); window.location.href="https://wa.me/270630705752"; }}>WhatsApp Us</a>
                </p>
            </div>
        </section>
    )
}


export default PurchaseSuccess;