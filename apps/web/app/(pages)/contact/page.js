import { IconWhatsapp } from "@/components/icons/IconWhatsapp";
import { MapEmbed } from "@/components/contact/MapEmbed";
import { getStaticMapUrl } from "@/services/google/staticMap.service";

const OFFICE_LAT = -33.9717388;
const OFFICE_LNG = 22.4444244;


export const metadata = {
	title: "Contact Us",
	description: "Based in the picturesque Garden Route city of George in the Western Cape Provence of South Africa, we are a vibrant and interactive center of innovation and technology that brings together entrepreneurs, developers, creators, professionals, and students.",
	openGraph:{
		title: "Contact Us",
		description: "Based in the picturesque Garden Route city of George in the Western Cape Provence of South Africa, we are a vibrant and interactive center of innovation and technology that brings together entrepreneurs, developers, creators, professionals, and students.",
		url: "https://grithub.co.za/contact",
		siteName: "GRIT Hub",
	},
	alternates: {
		canonical: "https://grithub.co.za/contact"
	}
}


async function ContactUs(){
    const mapPreviewSrc = getStaticMapUrl({ lat: OFFICE_LAT, lng: OFFICE_LNG });

    return(
        <>
            <section className="container-xxl d-flex pt-5 flex-column mb-5" id="coworking">
			<div className="col-12 d-flex flex-column flex-md-row">
				<div className="col-12 col-md-8 pe-md-5 mb-4">

					<h1 className="display-1">
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
					<MapEmbed previewSrc={mapPreviewSrc} />
				</div>
			</div>

				

			<hr className="hr my-5"/>

			<h3 className="display-3 text-center">
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