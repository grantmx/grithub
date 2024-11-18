

function WebsiteHosting(){
    return (
        <section className="container-xxl d-flex p-md-5 p-4 flex-column mb-5" id="coworking">
            <div className="col-12 d-flex flex-column">
                <span className="display-1 text-center">👏🤩</span>

                <h1 className="display-6 text-center">
                    Thank you for your decision to host your website with us!
                </h1>

                <p className="fs-4 text-center mb-5">
                    Checkout securely below to begin your hosting subscription.<br/>Your reoccurring monthly payment will be securely processed though Payfast.<br/>
                    
                    <a className="btn btn-primary btn-lg mt-3 d-inline-flex align-items-center py-3 px-5" href="https://www.payfast.co.za/eng/process?cmd=_paynow&receiver=19823624&item_name=Monthly+Website+Hosting+Fee&email_confirmation=1&confirmation_address=marshall@grithub.org.za&item_description=Recurring+website+hosting+fee+at+R79+per+month.&return_url=https://grithub.org.za/success&cancel_url=https://grithub.org.za/cancel&amount=79&subscription_type=1&recurring_amount=79&cycles=0&frequency=3">
                        <svg id="icon-lock2" viewBox="0 0 32 32" fill="#fff" width="25" height="25">
                            <path d="M18.5 14h-0.5v-6c0-3.308-2.692-6-6-6h-4c-3.308 0-6 2.692-6 6v6h-0.5c-0.825 0-1.5 0.675-1.5 1.5v15c0 0.825 0.675 1.5 1.5 1.5h17c0.825 0 1.5-0.675 1.5-1.5v-15c0-0.825-0.675-1.5-1.5-1.5zM6 8c0-1.103 0.897-2 2-2h4c1.103 0 2 0.897 2 2v6h-8v-6z"></path>
                        </svg>
                        <span className="fs-4 ms-2">
                            Secure Checkout
                        </span>
                    </a>
                </p>

                <p className="fs-4 text-center">
                    If you have any questions regarding your website hosting<br/> send us an email at <a href="mailto:workforce@grithub.org.za">workforce@grithub.org.za</a> or <a href="#" onClick={(e) =>{ e.preventDefault(); window.location.href="https://wa.me/270630705752"; }}>WhatsApp Us</a>
                </p>
            </div>
        </section>       
    )
}

export default WebsiteHosting