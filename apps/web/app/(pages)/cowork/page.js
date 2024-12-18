import Image from "next/image";
import image3 from '/public/assets/IMG_7442.jpg'
import Style from "./cowork.module.scss"
import BookingWidget from "/components/bookings/BookingWidget";
import clsx from "clsx";
import { IconWhatsapp } from "/components/icons/IconWhatsapp";


export const metadata = {
	title: "Coworking Space in George"
}


async function CoWork(){
    return(
		<section className="container-xxl d-flex pt-5 flex-column mb-5" id="coworking">
			<div className="col-12 d-flex flex-column flex-md-row">
				<div className="col-12 col-md-8 pe-md-5 mb-4">
					<h1 className="display-2 fw-bold">
						Coworking in George
					</h1>

					<h2 className="text-muted fw-light mb-5">Our office space in George provides a productive and secure work environment giving you the opportunity to network with like minded people.</h2>
					
					<hr className="my-5"/>

					<p>At our core is an inspiring environment for collaboration, experimentation, and exploration. Here, individuals can exchange ideas, share experiences, and learn from one another to unlock new possibilities. We provide a secure and productive work setting for those who wish to take advantage of it. From audio-visual equipment to modern conference rooms and Hot Desks.</p>
					
					<p>Find us at:</p>
					<address className="vcard">
						<span className="fn">GRIT Hub CoWorking George</span><br />
						<span className="adr">
							<span className="street-address">York St. Blvd. Shopping Center,<br />
							Suite #2, 1st Floor,</span> <br />
							<span className="locality">George, </span> 
							<span className="region">Western Cape </span>
							<span className="postal-code">6529</span><br />
							<span className="country-name">South Africa</span>
						</span>
					</address>
					

					<hr className="my-5" />

					<h4 className="fw-bold display-6">Refund Policy</h4>
					<p>In the unlikely event that <u>we</u> need to cancel your booking, we'll refund you.</p>

					<h4 className="mt-5 display-6 fw-bold">
						Our Cancellation Policy
					</h4>
					<ul className="d-flex m-0 p-0 justify-content-around list-unstyled">
						<li>All - Within 2 hours of venue confirmation</li>
						<li className="px-4">Desks - 24 hours before arrival time.</li>
						<li>Group Spaces - 24 hours before arrival time.</li>
					</ul>
				</div>

				<div className="col-12 col-md-4">
					<Image 
						width={300}
						height={400}
						src={image3.src} 
						className={clsx(Style.image, "mb-4")} 
						alt="hot desks" 
					/>

					<BookingWidget />
				</div>

			</div>


			<hr className="hr my-5"/>
				

			<div className="col-12 d-flex align-items-center flex-column mt-5">
				<h2 className="fw-bold display-4">Facility Highlights</h2>

				<div className="col-12 d-flex flex-wrap">
					<div className="col-xl-4 col-md-6 col-12 p-4 d-flex flex-column align-items-center">
						<Image src="/assets/wifi_tethering.svg" width={50} height={50} alt="wifi" />
						<p className="lead pt-3 text-center">+500 Mbs Fast Fiber. Audio, Video and Podcasting Equipment. Charging Stations. Mac Friendly Ecosystem</p>
					</div>
					<div className="col-xl-4 col-md-6 col-12 p-4 d-flex flex-column align-items-center">
						<Image src="/assets/presentation.svg" width={50} height={50} alt="conference rooms"/>
						<p className="lead pt-3 text-center">Modern Conference Room, Meeting &amp; Board Room. Event catering options available.</p>
					</div>
					{/* <div className="col-xl-3 col-md-6 col-12 p-4 d-flex flex-column">
						<Image src="/assets/build.svg" width={50} height={50} alt="fablabs"/>
						<p className="lead pt-3">FabLabs Network. 3D Printer. Laser Cutter. Vinyl cutter. 3D scanner. Thermoforming machine. CNC Milling Machine.</p>
					</div> */}
					<div className="col-xl-4 col-md-6 col-12 p-4 d-flex flex-column align-items-center">
						<Image src="/assets/airport_shuttle.svg" width={50} height={50} alt="safe"/>
						<p className="lead pt-3 text-center">Accessible to public transport. Safe metro area where all patrons will feel comfortable and inspire creativity.</p>
					</div>
					{/* <div className="col-xl-3 col-md-6 col-12 p-4 d-flex flex-column">
						<Image src="/assets/child_friendly.svg" width={50} height={50} alt="daycare"/>
						<p className="lead pt-3">Child Daycare &amp; Digital Playroom and youth services for business minded families who need support.</p>
					</div> */}
					<div className="col-xl-4 col-md-6 col-12 p-4 d-flex flex-column align-items-center">
						<Image src="/assets/laptop_mac.svg" width={50} height={50} alt="mac repair"/>
						<p className="lead pt-3 text-center">100% Uptime Load Shedding contingency, wifi backup, backup-lighting</p>
					</div>
					<div className="col-xl-4 col-md-6 col-12 p-4 d-flex flex-column align-items-center">
						<Image src="/assets/fingerprint.svg" width={50} height={50} alt="secure"/>
						<p className="lead pt-3 text-center">Security and Biometric controlled access. Cleaning and maintenance services. Contingency for electricity failure.</p>
					</div>
					<div className="col-xl-4 col-md-6 col-12 p-4 d-flex flex-column align-items-center">
						<Image src="/assets/print.svg" width={50} height={50} alt="office facilities"/>
						<p className="lead pt-3 text-center">On Demand Copy, printing and scanning services. 3D Printer for prototyping</p>
					</div>
				</div>
			</div>

			<hr className="hr my-5"/>

			<h3 className="display-3 text-center fw-bold">Ready to join us?</h3>
			<p className="lead text-muted fs-3 text-center">
				Join our fully furnished and modern coworking and meeting spaces to inspire creativity and promote cluster collaboration in George, Western Cape, South Africa.
			</p>

			<p className="text-center">
				<a className="btn rounded-pill btn-success btn-lg align-items-center py-3 px-4" href="https://wa.me/270630705752">
					<IconWhatsapp width={25} height={25} style={{ fill: "#ffffff", marginRight: ".5rem" }} />
					WhatsApp us now to book
				</a>
			</p>
		</section>

    )
}

export default CoWork;