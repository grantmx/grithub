import CelebrationSuccess from "@/components/feedback/CelebrationSuccess";

function Book(){
    return(
            <section className="container-xxl d-flex p-md-5 p-4 flex-column mb-5" id="coworking">
                <CelebrationSuccess />

                <div className="col-12 d-flex flex-column">
                    <span className="display-1 text-center">🥳</span>

                   <p className="display-6 text-center">
                        You will receive a confirmation email shortly.
                   </p>
                   <p className="fs-4 text-center">
                        If you have any questions regarding your booking<br/> send us an email at <a href="mailto:workforce@grithub.org.za">workforce@grithub.org.za</a> or <a href="https://wa.me/270630705752">WhatsApp Us</a>
                   </p>

                    <hr />

                    <div className="d-flex">
                        <div className="p-3">
                            <h4 className="">Refund Policy</h4>
                            <p className="">In the unlikely event that we need to cancel your booking, we’ll refund you.</p>
                        </div>

                        <div className="pt-3 ps-5 pe-3">
                            <h4 className="">Free Cancelation</h4>
                            <ul className="d-flex m-0 p-0 justify-content-around list-unstyled">
                                <li><strong>All Workspaces</strong>:<br/> Within 2 hours of venue confirmation</li>
                                <li className="px-3"><strong>Hot Desks</strong>:<br/> 24 hours before arrival time.</li>
                                <li><strong>Group Spaces</strong>:<br/> 24 hours before arrival time.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>
    )
}


export default Book;