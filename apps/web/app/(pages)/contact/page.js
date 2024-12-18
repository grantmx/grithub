import { IconWhatsapp } from "/components/icons/IconWhatsapp";
import Image from "next/image";
import image3 from '/public/assets/IMG_7442.jpg'
import clsx from "clsx";



function ContactUs(){
    return(
        <>
            <section className="container-xxl d-flex pt-5 flex-column mb-5" id="coworking">
			<div className="col-12 d-flex flex-column flex-md-row">
				<div className="col-12 col-md-8 pe-md-5 mb-4">

					<h1 className="display-2 fw-bold">
						Contact Us
					</h1>

					<p className="text-muted fw-light fs-2 mb-5">Based in the picturesque Garden Route city of George in the Western Cape Provence of South Africa, we are a vibrant and interactive center of innovation and technology that brings together entrepreneurs, developers, creators, professionals, and students. </p>
					
					<h2>Find us at:</h2>
					<address className="vcard fs-5">
						<span className="fn">Garden Route Innovation and Technology Hub</span><br />
						<span className="adr text-muted">
							<span className="street-address">York St. Blvd. Shopping Center,<br />
							Suite #2, 1st Floor,</span> <br />
							<span className="locality">George, </span> 
							<span className="region">Western Cape </span>
							<span className="postal-code">6529</span><br />
							<span className="country-name">South Africa</span>
						</span>
					</address>

					<p>
                        <a className="btn rounded-pill btn-success btn-lg align-items-center py-3 px-4" href="https://wa.me/270630705752">
                            <IconWhatsapp width={25} height={25} style={{ fill: "#ffffff", marginRight: ".5rem" }} />
                            WhatsApp us to chat
                        </a>
                    </p>
				</div>

				<div className="col-12 col-md-4">
					<iframe 
						src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d13235.23749715816!2d22.4444244!3d-33.9717388!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1dd61bad26029aad%3A0xe15b07dedb1520bf!2sGarden%20Route%20Innovation%20and%20Technology%20Hub!5e0!3m2!1sen!2sus!4v1731931229527!5m2!1sen!2sus" 
						width="600" 
						height="450" 
						style={{ border: 0, objectFit: "contain", width: "100%", height: "100%" }} 
						allowFullScreen="" loading="lazy" 
						referrerPolicy="no-referrer-when-downgrade" 
					/>
					
					{/* <Image 
						width={300}
						height={400}
						src={image3.src} 
						className="mb-4 w-100 h-auto" 
						alt="hot desks" 
					/> */}

                    
				</div>                
			</div>

				

			<hr className="hr my-5"/>

			<h3 className="display-3 text-center fw-bold">
				Want to partner with us?
			</h3>
			<p className="lead text-muted fs-3 text-center">
				We partner with institutions, organizations, and individuals who share our vision of a tech-savvy and innovative Africa. <a href="mailto:workforce@grithub.org.za">Send us a message</a> to discuss how we can work together.
			</p>

			
		</section>

        </>
    )
}

export default ContactUs;