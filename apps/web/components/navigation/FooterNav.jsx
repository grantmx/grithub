import Image from 'next/image';
import FooterEmailForm from '../../components/FooterEmailForm';


function FooterNav(){
    return(
        <footer className="col-12 d-flex flex-wrap justify-content-center flex-wrap p-4" id="contact">
            
            <div className="col-md-4 col-12 d-flex p-4 flex-column">
                <span><Image src="/assets/grithub-logo-horz-dark.svg" width="300" height={75} alt="GRIT Hub Logo"/></span>
                <small className="mt-2 text-muted">Garden Route Innovation &amp; Technology Hub (GRIT Hub) is a Non-Profit company catalyzing innovation and technology in the digital economy.</small>
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
                <button type="button" className="btn px-1 d-flex" onClick={() =>{ window.location.href="https://www.facebook.com/grithub.za"; }}>
                    <Image src="/assets/facebook-official.svg" width={25} height={25} alt="facebook"/>
                    <small className="ms-2">Facebook</small>
                </button>
                <button type="button" className="btn px-1 d-flex" onClick={() =>{ window.location.href="https://twitter.com/grithub_za"; }}>
                    <Image src="/assets/twitter.svg" width={25} height={25} alt="twitter"/>
                    <small className="ms-2">Twitter</small>
                </button>
            </div>
            

            <div className="col-md-4 col-12 p-4 d-flex justify-content-top flex-column align-item-center">
                <h4 className="fw-bold">Join Us</h4>
                <small className="mb-3 text-muted">Be the first to know when we launch and get specialized updates on programing.</small>
                <FooterEmailForm />
            </div>
            
            {/* <div className="col-12 p-2 border-top mt-2 text-center">
                <small className="text-muted" style={{fontSize: "11px"}}>
                    Attributions: &nbsp;
                    <a className="text-muted" target="_blank" href='https://www.freepik.com/photos/city' rel="noreferrer" title="freepak wayhomestudio">Way Home Studio</a>, &nbsp;
                    <a className="text-muted" href='https://www.freepik.com/vectors/abstract' rel="noreferrer" title="freepak starline">Starline</a>, &nbsp;
                    <a className="text-muted" href='https://www.freepik.com/vectors/office' rel="noreferrer" title="freepak piki">Piki Super Star</a>, &nbsp;
                    <a className="text-muted" href="https://www.freepik.com/photos" title="Freepik" rel="noreferrer">Freepik Photos</a>, &nbsp;
                    <a className="text-muted" href="https://www.flaticon.com/" title="Flaticon" rel="noreferrer">Freepik Icons</a>
                </small>
            </div> */}
        </footer>
    )
}


export default FooterNav;
