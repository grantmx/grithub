import GeneralPage from "components/layout/GeneralPage";
import Image from "next/image";


function CoWork(){
    return(
        <GeneralPage 
            title="Coworking Spaces"
            subTitle="Fully furnished and modern coworking and meeting spaces to inspire creativity and promote cluster collaboration.  Our spaces will provide a productive and secure work environment giving you the opportunity to network with like minded people. "
        >

            <section className="container-fluid d-flex justify-content-between align-items-center p-5 flex-colum" id="coworking">
					<div className="col-12 d-flex align-items-center flex-column">
						<div className="col-md-9 col-12 mb-5">
							<p className="lead text-center">
								<a className="border-bottom text-decoration-none" href="/whitepapers/Harnessing_the_Potential_of_Coworking.pdf" target="_blank" rel="noreferrer" title="white the power of coworking">White Paper: Harnessing the Power of Coworking &rsaquo;</a>
								<br/> 
								<a className="border-bottom text-decoration-none" href="/whitepapers/The-Future-of-Coworking-White-Paper-OpenWork-Agency-May-29-2020.pdf" target="_blank" rel="noreferrer" title="white paper on coworking future">White Paper: COVID-19 and The Future of Coworking &rsaquo;</a>
							</p>
						</div>

						<div className="col-12 d-flex flex-wrap">
							<div className="col-xl-4 col-md-6 col-12 p-4 d-flex flex-column align-items-center">
								<Image src="/assets/wifi_tethering.svg" width={50} height={50} alt="wifi" />
								<p className="lead pt-3 text-center">200 Mbs Fast Fiber. Audio, Video and Podcasting Equipment. Charging Stations.</p>
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
								<p className="lead pt-3">Load shedding contingency, wifi backup, backup-lighting </p>
							</div>
							<div className="col-xl-4 col-md-6 col-12 p-4 d-flex flex-column align-items-center">
								<Image src="/assets/fingerprint.svg" width={50} height={50} alt="secure"/>
								<p className="lead pt-3 text-center">Security and controlled access. Cleaning and maintenance services. Contingency for electricity failure.</p>
							</div>
							{/* <div className="col-xl-3 col-md-6 col-12 p-4 d-flex flex-column">
								<Image src="/assets/local_cafe.svg" width={50} height={50} alt="office facilities"/>
								<p className="lead pt-3">Copying, printing and scanning facilities. Reception &amp; Mail Services.</p>
							</div> */}
						</div>
					</div>
				</section>

        </GeneralPage>
    )
}

export default CoWork;