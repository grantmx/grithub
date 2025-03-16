import Image from 'next/image';
import Link from 'next/link';
import FooterEmailForm from "../emails/FooterEmailForm";


function FooterNav(){
    return(
        <footer className="col-12 d-flex flex-wrap justify-content-center flex-wrap p-4 pb-0 border-top" id="contact">
            <div className="col-md-4 col-12 d-flex p-md-4 pb-4 flex-column">
                <Image 
                    src="/assets/grithub-logo-horz.svg" 
                    width="270" 
                    height={75} 
                    alt="GRIT Hub Logo"
                    className='w-md-100'
                />
                
                <small className="mt-2">Garden Route Innovation &amp; Technology Hub (GRIT Hub) is a registered Non-Profit company catalyzing innovation and technology in the digital economy.</small>
                <address className="mt-3 pt-3 border-top lh-sm">
                    <small>
                        Office Suite #2, York Street Blvd. Shopping Center.<br/> George South, George 6529<br/>South Africa &nbsp;
                        <a rel='noreferrer' target="_blank" href="https://www.google.com/maps/dir//garden+route+innovation+and+technology+hub/data=!4m6!4m5!1m1!4e2!1m2!1m1!1s0x1dd61bad26029aad:0xe15b07dedb1520bf?sa=X&ved=2ahUKEwicrqbBw9b-AhWYi1wKHToBDNAQ9Rd6BAhMEAU">
                            Get directions &rsaquo;
                        </a>
                    </small>
                </address>
            </div>

            <div className="col-md-3 col-12 p-md-4 pb-4 d-flex justify-content-top flex-column">
                <p className="fw-bold fs-4">Find Us</p>
                
                <a className="btn rounded-pill px-1 d-flex" href="https://wa.me/270630705752">
                    <Image src="/assets/whatsapp.svg" width={25} height={25} alt="whatsapp us"/>
                    <small className="ms-2">+27 (063) 070 5752</small>
                </a>
                <a className="btn rounded-pill px-1 d-flex" href="mailto:workforce@grithub.org.za">
                    <Image src="/assets/mail_outline.svg" width={25} height={25} alt="email us"/>
                    <small className="ms-2">workforce@grithub.org.za</small>
                </a>

                <div className="d-flex flex-row flex-wrap mt-4">
                    <a className="btn rounded-pill px-1 d-flex w-50" href="https://www.facebook.com/grithub.za">
                        <Image src="/assets/facebook-official.svg" width={25} height={25} alt="GRIT Hub on facebook"/>
                        <small className="ms-2">Facebook</small>
                    </a>
                    <a className="btn rounded-pill px-1 d-flex w-50" href="https://www.linkedin.com/company/grithub-za">
                        <Image src="/assets/linkedin.svg" width={25} height={25} alt="GRIT Hub on linkedin"/>
                        <small className="ms-2">Linkedin</small>
                    </a>
                    <a className="btn rounded-pill px-1 d-flex w-50" href="https://www.instagram.com/grithub_za/">
                        <Image src="/assets/instagram.svg" width={25} height={25} alt="GRIT Hub on Instagram"/>
                        <small className="ms-2">Instagram</small>
                    </a>
                    <a className="btn rounded-pill px-1 d-flex w-50" href="https://patreon.com/grithub_za">
                        <Image src="/assets/patreon.svg" width={25} height={25} alt="GRIT Hub on Patreon"/>
                        <small className="ms-2">Patreon</small>
                    </a>
                </div>
                
            </div>
            
            <div className="col-md-4 col-12 p-md-4 d-flex justify-content-top flex-column align-item-center">
                <p className="fw-bold fs-4">
                    Join Us
                </p>

                <small className="mb-3 text-muted">Be the first to know when we publish new articles and specialized updates on programming.</small>
                <FooterEmailForm />
            </div>
            
            <small className="col-12 px-0 py-5 py-md-4 mb-5 mb-md-0 border-top mt-2 text-center text-muted">
                &copy; {new Date().getFullYear()} Garden Route Innovation & Technology Hub, NPC. All rights reserved.  &nbsp;&nbsp; <Link href="/about" title="terms of use">About Us</Link> &nbsp;|&nbsp; <Link href="/terms" title="terms of use">Terms</Link> &nbsp;|&nbsp;  <Link href="/privacy" title="privacy policy">Privacy</Link>  &nbsp;|&nbsp;  <Link href="/media-kit" title="brand guidelines">Media Kit</Link>
            </small>
        </footer>
    )
}


export default FooterNav;
