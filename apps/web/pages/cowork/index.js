import GeneralPage from "components/layout/GeneralPage";
import Image from "next/image";
import image2 from 'public/assets/startup-hero.jpg'
import image3 from 'public/assets/IMG_7442.jpg'
import Style from "./cowork.module.scss"
import BookingWidget from "../../components/bookings/BookingWidget";
import clsx from "clsx";

function CoWork(){
    return(
        <GeneralPage 
            title="Coworking Spaces"
            subTitle="Fully furnished and modern coworking and meeting spaces to inspire creativity and promote cluster collaboration. "
			image={image2}
		>

            <section className="container-xxl d-flex p-md-5 p-4 flex-column mb-5" id="coworking">
				<div className="col-12 d-flex flex-column flex-md-row">
					<div className="col-12 col-md-8 pe-md-5 mb-4">
						<h2>Our Hot Desks and Dedicated Offices provide a productive and secure work environment giving you the opportunity to network with like minded people.</h2>
						<p className="mt-3">Based in the picturesque Garden Route, we are a vibrant and interactive center of innovation and technology that brings together entrepreneurs, developers, creators, professionals, and students. </p>
						<p>At our core is an inspiring environment for collaboration, experimentation, and exploration. Here, individuals can exchange ideas, share experiences, and learn from one another to unlock new possibilities. We provide a secure and productive work setting for those who wish to take advantage of it. From audio-visual equipment to modern conference rooms and private offices.</p>
						
						<hr className="my-5" />

						<h4>Refund Policy</h4>
						<p>In the unlikely event that we need to cancel your booking, we’ll refund you.</p>

						<h4 className="mt-5">Free Cancelation</h4>
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

						{/* <BookingWidget /> */}
					</div>

				</div>


				<hr className="hr my-5"/>
					

				<div className="col-12 d-flex align-items-center flex-column mt-5">
					<h2>Facility Highlights</h2>

					<div className="col-12 d-flex flex-wrap">
						<div className="col-xl-4 col-md-6 col-12 p-4 d-flex flex-column align-items-center">
							<Image src="/assets/wifi_tethering.svg" width={50} height={50} alt="wifi" />
							<p className="lead pt-3 text-center">+200 Mbs Fast Fiber. Audio, Video and Podcasting Equipment. Charging Stations.</p>
						</div>
						<div className="col-xl-4 col-md-6 col-12 p-4 d-flex flex-column align-items-center">
							<Image src="/assets/presentation.svg" width={50} height={50} alt="conference rooms"/>
							<p className="lead pt-3 text-center">Modern Conference Room, Meeting &amp; Board Room and Focus Room. Private Office suites available</p>
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
							<p className="lead pt-3 text-center">On Demand Copy, printing and scanning services.</p>
						</div>
					</div>
				</div>
			</section>

        </GeneralPage>
    )
}

export default CoWork;