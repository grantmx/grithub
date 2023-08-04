import Image from 'next/image';
import FooterEmailForm from '../FooterEmailForm';
import Link from 'next/link';


function FooterNav(){
    return(
        <footer className="col-12 d-flex flex-wrap justify-content-center flex-wrap p-4 pb-0 border-top" id="contact">
            
            <div className="col-md-4 col-12 d-flex p-4 flex-column">
                <span><Image src="/assets/grithub-logo-horz.svg" width="300" height={75} alt="GRIT Hub Logo"/></span>
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

            <div className="col-md-3 col-12 p-4 d-flex justify-content-top flex-column">
                <h4 className="fw-bold">Find Us</h4>
                
                <button type="button" className="btn px-1 d-flex" onClick={() =>{ window.location.href="https://wa.me/270630705752"; }}>
                    <Image src="/assets/whatsapp.svg" width={25} height={25} alt="whatsapp us"/>
                    <small className="ms-2">+27 (063) 070 5752</small>
                </button>
                <button type="button" className="btn px-1 d-flex" onClick={() =>{ window.location.href="mailto:workforce@grithub.org.za"; }}>
                    <Image src="/assets/mail_outline.svg" width={25} height={25} alt="email us"/>
                    <small className="ms-2">workforce@grithub.org.za</small>
                </button>

                <div className="d-flex flex-row flex-wrap mt-4">
                    <button type="button" className="btn px-1 d-flex w-50" onClick={() =>{ window.location.href="https://www.facebook.com/grithub.za"; }}>
                        <Image src="/assets/facebook-official.svg" width={25} height={25} alt="GRIT Hub on facebook"/>
                        <small className="ms-2">Facebook</small>
                    </button>
                    <button type="button" className="btn px-1 d-flex w-50" onClick={() =>{ window.location.href="https://twitter.com/grithub_za"; }}>
                        <Image src="/assets/twitter.svg" width={25} height={25} alt="GRIT Hub on twitter"/>
                        <small className="ms-2">Twitter</small>
                    </button>
                    <button type="button" className="btn px-1 d-flex w-50" onClick={() =>{ window.location.href="https://www.instagram.com/grithub_za/"; }}>
                        <Image src="/assets/instagram.svg" width={25} height={25} alt="GRIT Hub on Instagram"/>
                        <small className="ms-2">Instagram</small>
                    </button>
                    <button type="button" className="btn px-1 d-flex w-50" onClick={() =>{ window.location.href="https://patreon.com/grithub_za"; }}>
                        <Image src="/assets/patreon.svg" width={25} height={25} alt="GRIT Hub on Patreon"/>
                        <small className="ms-2">Patreon</small>
                    </button>
                </div>
                
            </div>
            

            <div className="col-md-4 col-12 p-4 d-flex justify-content-top flex-column align-item-center">
                <h4 className="fw-bold">Join Us</h4>
                <small className="mb-3 text-muted">Be the first to know when we launch and get specialized updates on programing.</small>
                <FooterEmailForm />
            </div>
            
            <small className="col-12 px-0 py-5 py-md-4 mb-5 mb-md-0 border-top mt-2 text-center text-muted">
                &copy; {new Date().getFullYear()} Garden Route Innovation & Technology Hub, NPC. All rights reserved.  &nbsp;&nbsp; <Link href="/terms" title="terms of use">Terms</Link> &nbsp;|&nbsp;  <Link href="/privacy" title="privacy policy">Privacy</Link>  &nbsp;|&nbsp;  <Link href="/media-kit" title="brand guidelines">Media Kit</Link>
            </small>
        </footer>
    )
}


export default FooterNav;
