/* eslint-disable react/no-unescaped-entities */
import Style from 'styles/home.module.scss';

import Image from 'next/image';
import { Helmet } from 'react-helmet';
import { NextSeo } from 'next-seo';
import { StructuredJSON } from '../components/StructuredJSON';
import MainNav from '../components/navigation/MainNav';
import FooterNav from '../components/navigation/FooterNav';

import afriLabs from "public/assets/partners/cropped-AfriLabs-Logo_AfriLabs-Logo-Horizontal-1-1536x438.png" 
import georgeBusiness from 'public//assets/partners/georgebusinesschamberlogo.png'
import hero from "public/assets/hero.jpg" 
import clsx from 'clsx';
import ribbon from 'styles/ribbon.module.scss'
import home from 'styles/home.module.scss';

export default function Home(){
	return(
		<>
			<NextSeo 
				title="Garden Route Innovation and Technology Hub"
				description="Your future starts here! Garden Route Innovation and Technology in the Western Cape Lab is here to incubate innovation and entrepreneurship in the digital economy"
				canonical="https://grithub.org.za/"
			/>

			<main className="container-fluid d-flex p-0 flex-column">
				<section className={Style.heroWrapper}>
					<Image 
						className={Style.heroImg} 
						src={hero}
						alt="See your future ahead of you" 
					/>

					<div className={Style.hero}>
						<MainNav />

						<div className="col-9 col-md-7 ps-md-5 ps-3 ms-md-2 ms-xl-0 mt-md-5">
							<p className={Style.heroHashTag}>#GRITHub</p>
							<p className={Style.heroText}>Catalyzing innovation, entrepreneurship and the new workforce in the digital economy.</p>
							<a href="#about" className={"btn-outline-dark btn btn-lg"} type="button" title="learn about the digital economy">Learn more</a>
						</div>

						<div className={Style.heroPartners}>
							<small className="text-white w-100 mb-0">
								Our strategic partners and stakeholders
							</small>

							<div className="col-12 d-flex justify-content-start align-items-center">
								<div className="col-2 me-5">
									<a href="https://afrilabs.com" target="_blank" className="d-block" rel="noreferrer">
										<Image 
											src={afriLabs}
											alt="AfriLabs" 
											className={clsx(Style.partnerLogo, Style.whiteLogo)}
										/>
									</a>
								</div>
								<div className="col-2 me-5">
									<a href="https://zen.coderdojo.com/dojos/za/george-municipality/george-western-cape-garden-route-innovation-and-technology-hub" target="_blank" className="d-block" rel="noreferrer" >
										<svg className={Style.partnerLogo} width="100%" height="100%" viewBox="0 0 315742 89184" style={{fillRule:"evenodd", clipRule:"evenodd", strokeLinejoin:"round", strokeMiterlimit: 1.41421 }}>
											<g id="Layer_x0020_1">
												<path id="path10" d="M121521,53670.8l0,8150c-79.166,2420.83 -562.5,4600 -1454.17,6454.17c-725,1612.5 -1858.33,3150 -3470.83,4358.33c-1612.5,1287.5 -3791.67,2016.67 -6695.83,2016.67c-2908.33,0 -5166.67,-729.167 -6779.17,-2016.67c-1612.5,-1208.33 -2662.5,-2745.83 -3387.5,-4358.33c-887.5,-1854.17 -1370.83,-4033.33 -1454.17,-6454.17l0,-34945.8c83.333,-2341.67 562.5,-4520.83 1454.17,-6375c725,-1612.5 1775,-3229.17 3387.5,-4437.5c1612.5,-1208.33 3875,-2020.83 6779.17,-2020.83c2908.33,0 5083.33,812.5 6695.83,2020.83c1612.5,1212.5 2745.83,2825 3470.83,4437.5c887.5,1858.33 1375,4033.33 1454.17,6375l0,8150l-8150,0l0,-8150c0,-1612.5 -404.166,-2745.83 -1291.67,-3712.5c-404.167,-404.167 -1129.17,-645.833 -2016.67,-645.833c-1533.33,0 -2258.33,1129.17 -2662.5,2179.17c-237.5,645.834 -320.833,1375 -404.167,2183.33l0,34945.8c83.334,1691.67 566.667,2825 1375,3708.33c404.167,408.334 966.667,645.834 1691.67,645.834c1858.33,0 2583.33,-966.667 2987.5,-2179.17c237.5,-562.5 320.833,-1291.67 320.833,-2179.17l0,-8150l8150,0ZM146921,63275c-237.5,4279.17 -1529.17,7262.5 -4354.17,9604.17c-1454.17,1212.5 -3470.83,1775 -6133.33,1775c-5250,0 -7829.17,-2908.33 -9120.83,-5812.5c-725,-1691.67 -1208.33,-3629.17 -1287.5,-5808.33l0,-22195.8c241.667,-4279.17 1529.17,-7420.83 4354.17,-9841.67c1375,-1216.67 3391.67,-1779.17 6054.17,-1779.17c5245.83,0 7908.33,2908.33 9200,5729.17c725,1695.83 1208.33,3554.17 1287.5,5654.17l0,22679.2l0,-4.167ZM139254,40833.3c83.333,-1691.67 -241.667,-2904.17 -1050,-3875c-404.167,-404.166 -1050,-645.833 -1775,-645.833c-1537.5,0 -2183.33,1050 -2504.17,2258.33c-241.667,645.834 -320.833,1375 -241.667,2258.33l0,22195.8c-79.166,1691.67 325,2908.33 1050,3791.67c404.167,404.166 966.667,645.833 1695.83,645.833c1529.17,0 2258.33,-966.667 2579.17,-2179.17c241.667,-645.833 325,-1375 241.667,-2258.33l0,-22195.8l4.167,4.166ZM173175,74004.2l-8150,0l0,-2908.33c-1370.83,1291.67 -2579.17,2258.33 -4112.5,2987.5c-812.5,404.167 -1616.67,562.5 -2341.67,562.5c-2258.33,0 -3791.67,-1291.67 -4762.5,-2987.5c-1050,-1612.5 -1529.17,-3791.67 -1529.17,-5645.83l0,-28166.7c0,-1854.17 483.333,-4033.33 1529.17,-5729.17c970.834,-1612.5 2504.17,-2908.33 4762.5,-2908.33c1529.17,0 3150,887.5 4358.33,1779.17c725,562.5 1370.83,1129.17 2095.83,1775l0,-18079.2l8150,0l0,59320.8ZM165025,39541.7c0,-1291.67 -1212.5,-2662.5 -2420.83,-2662.5c-1212.5,0 -2179.17,1129.17 -2179.17,2662.5l0,24775c0,1537.5 966.667,2662.5 2179.17,2662.5c1208.33,0 2420.83,-1129.17 2420.83,-2662.5l0,-24775ZM200129,58183.3l0,5087.5c-241.667,4279.17 -1529.17,7262.5 -4437.5,9604.17c-1454.17,1212.5 -3470.83,1775 -6133.33,1775c-5245.83,0 -7908.33,-2908.33 -9200,-5812.5c-725,-1691.67 -1208.33,-3629.17 -1291.67,-5808.33l0,-22195.8c241.666,-4279.17 1612.5,-7420.83 4520.83,-9841.67c1375,-1216.67 3391.67,-1779.17 6054.17,-1779.17c5245.83,0 7908.33,2908.33 9200,5729.17c725,1695.83 1208.33,3554.17 1287.5,5654.17l0,12833.3l-13479.2,0l0,9604.17c83.333,1691.67 562.5,2908.33 1291.67,3791.67c404.166,404.167 966.666,645.833 1695.83,645.833c1533.33,0 2258.33,-966.666 2579.17,-2179.17c241.666,-645.834 320.833,-1375 320.833,-2258.33l0,-4845.83l7587.5,0l4.167,-4.167ZM186650,47045.8l5891.67,0l0,-6216.67c0,-1691.67 -320.834,-2904.17 -1129.17,-3875c-404.167,-404.167 -1050,-645.834 -1775,-645.834c-1537.5,0 -2183.33,1050 -2583.33,2258.33c-241.667,645.833 -320.834,1375 -404.167,2258.33l0,6220.83ZM221862,38250c-725,-241.667 -1529.17,-320.833 -2258.33,-320.833c-1287.5,0 -2825,162.5 -4112.5,1370.83c-1537.5,1291.67 -1779.17,2662.5 -1779.17,4033.33l0,30670.8l-8150,0l0,-44150l8150,0l0,4925c83.333,-562.5 645.833,-1937.5 1937.5,-3229.17c1291.67,-1212.5 3229.17,-2341.67 6212.5,-2341.67l0,9041.67ZM225421,74004.2l0,-59320.8l6862.5,0c8066.67,0 12429.2,1612.5 14766.7,6133.33c2258.33,4520.83 2583.33,11945.8 2583.33,23566.7c0,11620.8 -325,18966.7 -2583.33,23487.5c-2337.5,4520.83 -6700,6133.33 -14766.7,6133.33l-6862.5,0ZM234142,65287.5c2983.33,0 4679.17,-325 5566.67,-3233.33c404.167,-1370.83 729.167,-3470.83 808.334,-6295.83c83.333,-2825 83.333,-6616.67 83.333,-11462.5c0,-4841.67 0,-8633.33 -83.333,-11462.5c-79.167,-2741.67 -404.167,-4841.67 -808.334,-6295.83c-883.333,-2825 -2579.17,-3145.83 -5566.67,-3145.83l0,41895.8ZM275546,63270.8c-237.5,4279.17 -1529.17,7262.5 -4354.17,9604.17c-1454.17,1212.5 -3470.83,1775 -6133.33,1775c-5250,0 -7829.17,-2908.33 -9120.83,-5812.5c-725,-1691.67 -1212.5,-3629.17 -1287.5,-5808.33l0,-22195.8c241.667,-4279.17 1533.33,-7420.83 4354.17,-9841.67c1375,-1216.67 3391.67,-1779.17 6054.17,-1779.17c5245.83,0 7908.33,2908.33 9200,5729.17c725,1695.83 1208.33,3554.17 1287.5,5654.17l0,22679.2l0,-4.167ZM267879,40829.2c83.333,-1691.67 -241.667,-2904.17 -1050,-3875c-404.167,-404.167 -1050,-645.834 -1775,-645.834c-1537.5,0 -2183.33,1050 -2504.17,2258.33c-241.667,645.833 -320.833,1375 -241.667,2258.33l0,22195.8c-79.166,1691.67 325,2908.33 1050,3791.67c404.167,404.167 966.667,645.833 1695.83,645.833c1533.33,0 2258.33,-966.666 2579.17,-2179.17c241.667,-645.834 325,-1375 241.667,-2258.33l0,-22195.8l4.167,4.167ZM280975,14679.2l8150,0l0,8150l-8150,0l0,-8150ZM289125,29854.2l0,45275c0,2258.33 0,5812.5 -1129.17,8720.83c-1129.17,2983.33 -3629.17,5325 -8233.33,5325c-1287.5,0 -2179.17,-83.333 -2741.67,-241.667c-325,-83.333 -562.5,-162.5 -808.333,-241.666l0,-7504.17c241.667,79.167 483.333,79.167 725,158.333c562.5,83.334 1050,162.5 1537.5,162.5c1370.83,0 2016.67,-1129.17 2337.5,-2500c83.333,-645.833 162.5,-1375 162.5,-2100c0,-729.166 0,-1375 0,-1858.33l0,-45195.8l8150,0ZM315738,63270.8c-237.5,4279.17 -1533.33,7262.5 -4354.17,9604.17c-1454.17,1212.5 -3470.83,1775 -6133.33,1775c-5250,0 -7829.17,-2908.33 -9120.83,-5812.5c-725,-1691.67 -1208.33,-3629.17 -1287.5,-5808.33l0,-22195.8c241.666,-4279.17 1529.17,-7420.83 4354.17,-9841.67c1375,-1216.67 3391.67,-1779.17 6054.17,-1779.17c5245.83,0 7908.33,2908.33 9200,5729.17c725,1695.83 1208.33,3554.17 1287.5,5654.17l0,22679.2l0,-4.167ZM308071,40829.2c83.334,-1691.67 -241.666,-2904.17 -1050,-3875c-404.166,-404.167 -1050,-645.834 -1775,-645.834c-1533.33,0 -2183.33,1050 -2504.17,2258.33c-241.667,645.833 -320.834,1375 -241.667,2258.33l0,22195.8c-79.167,1691.67 325,2908.33 1050,3791.67c404.167,404.167 966.667,645.833 1695.83,645.833c1533.33,0 2258.33,-966.666 2583.33,-2179.17c241.666,-645.834 325,-1375 241.666,-2258.33l0,-22195.8l0,4.167Z" style={{fill:"#fff"}}/>
												<g id="_833871744_">
													<path id="path17" d="M37425,27579.2l0,-15745.8c0,-687.5 250,-1283.33 754.167,-1783.33c500,-500 1095.83,-754.167 1787.5,-754.167l8208.33,0c679.167,0 1266.67,250 1762.5,754.167c495.833,500 741.667,1095.83 741.667,1783.33l0,15745.8c0,700 -250,1295.83 -741.667,1791.67c-495.833,495.834 -1095.83,741.667 -1795.83,741.667l-8175,0c-708.334,0 -1312.5,-245.833 -1804.17,-741.667c-491.667,-495.833 -733.333,-1091.67 -733.333,-1791.67l-4.167,0ZM48079.2,27483.3l0,-15520.8l-8020.83,0l0,15520.8l8020.83,0Z" style={{fill: "#fff"}}/>
													<path d="M44541.7,0c24600,0 44541.7,19941.7 44541.7,44541.7c0,24600 -19941.7,44541.7 -44541.7,44541.7c-24600,0 -44541.7,-19941.7 -44541.7,-44541.7c0,-24600 19941.7,-44541.7 44541.7,-44541.7ZM44072.1,2304.18c-201.823,0.248 -403.646,4.285 -605.468,8.321c-23033.3,333.333 -41620.8,19125 -41620.8,42233.3c0,23137.5 18629.2,41941.7 41700,42233.3c-11408.3,-287.5 -20575,-9637.5 -20575,-21112.5c0,-11652.6 9453.26,-21111.6 21103.8,-21120.8l34.152,-0.013c11650.5,-9.235 21103.8,-9468.19 21103.8,-21120.8c0,-11658.3 -9462.5,-21120.8 -21120.8,-21120.8l-19.532,0.012ZM51045.8,77816.7c370.836,-0.001 679.168,-125.001 933.334,-379.167c254.166,-258.333 383.333,-570.833 383.333,-937.5l0,-6795.83c0,-366.667 -129.167,-675 -383.333,-933.334c-254.167,-254.166 -566.667,-383.333 -933.334,-383.333c-362.5,0 -675,129.167 -929.166,391.667c-254.167,262.5 -383.334,570.833 -383.334,925l0,5479.17l-2633.33,0l0,-18154.2l-6608.33,0c-366.667,0 -679.167,129.166 -933.334,383.333c-254.166,254.167 -383.333,566.667 -383.333,929.167c0,366.666 125,679.166 383.333,933.333c258.334,254.167 566.667,383.333 933.334,383.333l3975,0l0,15520.8l-4041.67,0l0,4.166c-362.5,0 -675,125 -929.167,375c-254.166,254.167 -383.333,558.334 -383.333,912.5c0,366.667 125,683.334 383.333,950c254.167,262.5 562.5,395.834 929.167,395.834l10620.8,0Z" style={{fill:"#fff"}}/>
												</g>
											</g>
										</svg>
									</a>
								</div>
								<div className="col-2 me-5">
									<a href="https://georgechamber.co.za/" target="_blank" className="d-block" rel="noreferrer">
										<Image 
											src={georgeBusiness}
											alt="George Business Chamber." 
											className={Style.partnerLogo}
										/>
									</a>
								</div>
								<div className="col-2">
									<a href="https://sevengage.com" target="_blank" className="d-block" rel="noreferrer">
										<Image 
											src="/assets/partners/sevengage-logo.svg" 
											width={250} 
											height={75} 
											alt="Sevengage, Inc." 
											className={Style.partnerLogo}
										/>
									</a>
								</div>
							</div>
						</div>
					</div>
				</section>




				<section className="container-xxl col-12 d-flex justify-content-center align-items-center p-5 flex-column" id="about">
					<h1 className="fw-bold display-4 mb-4 text-center">Garden Route Innovation &amp; Technology Hub</h1>
					<div className="text-center col-xl-12 col-12">
						<p className="fs-2">Identifying untapped potential and refocusing it using the power of digital technology. </p>
						<p className='lead'>We provide workforce training, apprenticeships, tools, and mentorship opportunities to youth, small businesses and stakeholders in the Garden Route area...and all it takes is GRIT and determination. </p>
						{/* <p>Our duty is to empower community members and small businesses to actively participate in the local supply chain through collaborations with academia, business and government partners using modern technology and innovation.</p> */}
					</div>
				</section>


				
				<section className="container-xxl col-12 d-flex justify-content-center align-items-center p-0 mb-5 flex-column">
					<div className="col-12 d-flex flex-wrap">
						<div className="col-xl-4 col-md-6 col-12 p-4">
							<div className="card shadow-sm h-100">
								<Image src="/assets/workshop-thumb.jpg" width={500} height={333} className={Style.cardTopImg} alt="Workshops and Programs" />
								<div className="card-body d-flex flex-column">
									<h3 className="card-title fs-4 fw-bold">Real Workforce Training</h3>
									<p className="card-text">Programing and Industry workshops using the latest real-world knowledge from industry experts. <a href="/programs" className="text-decoration-underline" title="more about programs">More &rsaquo;</a></p>
								</div>
							</div>
						</div>

						<div className="col-xl-4 col-md-6 col-12 p-4">
							<div className="card shadow-sm h-100">
								<Image src="/assets/incubator-thumb.jpg" width={500} height={333} className={Style.cardTopImg} alt="Entrepreneurship Incubation" />
								<div className="card-body d-flex flex-column">
									<h3 className="card-title fs-4 fw-bold">Entrepreneurship Incubation</h3>
									<p className="card-text">Tailored workshops, networking, online learning and hands-on mentorship for accelerating business growth. <a href="#incubator" className="text-decoration-underline" title="more about incubation">More &rsaquo;</a></p>
								</div>
							</div>
						</div>

						<div className="col-xl-4 col-md-6 col-12 p-4">
							<div className="card shadow-sm h-100">
								<Image src="/assets/office-space.jpg" width={500} height={333} className={Style.cardTopImg} alt="About our coworking spaces"/>
								<div className="card-body d-flex flex-column">
									<h3 className="card-title fs-4 fw-bold">Coworking</h3>
									<p className="card-text">Modern, sleek and creative spaces fostering collaboration and productivity so that you can work without distraction. <a href="#coworking" className="text-decoration-underline" title="more about coworking">More &rsaquo;</a></p>
								</div>
							</div>
						</div>

						<div className="d-md-flex d-xs-none d-xl-none col-xl-4 col-md-6 col-12 p-md-5 p-4 justify-content-center flex-column align-item-center">
							<h3 className="display-6 fw-bold">We strive for wholistic change at every level of the economy.</h3>
							<p className="lead">Our core values of: Collaboration, Equality, Responsibility, Entrepreneurial Ethic, Innovation and a Giving Spirit not only bind us, but guide us.</p>
						</div>

					</div>
				</section>



				<section className='bg-light py-2'>
					<h2 className="fw-bold display-5 mt-5 mb-0 text-center">
						Up Coming Workforce Training Courses
					</h2>

					<p className="lead text-center mt-2">
						<a href="/programs" target="_blank" rel="noreferrer" title="learn more about our programs">View All Workforce Trainings and Programs &rsaquo;</a>
					</p>

					<div className="col-12 d-flex justify-content-between flex-wrap mb-5">
						

						<div className="col-xl-4 col-md-6 col-12 p-md-5 p-3">
							<div className="card shadow-sm position-relative h-100 align-items-center">
								<div className={`${ribbon.ribbon_top_right} ${ribbon.ribbon__purple}`}><span>Workforce</span></div>
								<Image src="/assets/278-2783353_mobile-mobile-phone-icon-red-png.png" width={150} height={150} className={home.cardTopOverflow} alt="mobile"  />
								<div className="card-body d-flex flex-column justify-content-between">
									<h3 className="card-title fs-4 fw-bold">Mobile Web (Beginner)</h3>
									<p className="card-text"><strong>NO CODING EXPERIENCE REQUIRED.</strong> Apply the concept of mobile friendliness to a website; learn ways to modify an existing website in to a mobile optimized one. You will also learn responsive design and designing for a mobile user.</p>
									{/* <div className="alert alert-secondary text-center" role="alert">
										Registration Opens February 2032
									</div> */}
									<p>
										<a href="https://grithub-za-1.hubspotpagebuilder.com/mobile-for-beginners" className="btn btn-primary btn-lg">
											Register Now
										</a>
									</p>
								</div>
							</div>
						</div>


						<div className="col-xl-4 col-md-6 col-12 p-md-5 p-3">
							<div className="card shadow-sm position-relative h-100 align-items-center">
								<div className={`${ribbon.ribbon_top_right} ${ribbon.ribbon__purple}`}><span>Workforce</span></div>
								<Image src="/assets/js.png" width={150} height={150} className={home.cardTopOverflow} alt="javascript" />
								<div className="card-body d-flex flex-column justify-content-between">
									<h3 className="card-title fs-4 fw-bold">JavaScript (Beginner)</h3>
									
									<p className="card-text">Learn the history of JavaScript; how to write proper functional JavaScript syntax and Object Oriented Programming concepts; You should be able to iterate data and show the results in the browser and have completed a JavaScript application.</p>
									<div className="alert alert-secondary text-center" role="alert">
										Registration Opens March 2032
									</div>

									{/* <p>
										<a href="" className="btn btn-primary btn-lg disabled">
											Register
										</a>
										
									</p> */}
								</div>
							</div>
						</div>


						<div className="col-xl-4 col-md-6 col-12 p-md-5 p-3">
							<div className="card shadow-sm position-relative h-100 align-items-center">
								<div className={`${ribbon.ribbon_top_right} ${ribbon.ribbon__purple}`}><span>Workforce</span></div>
								<Image src="/assets/html.png" width={150} height={150} className={home.cardTopOverflow} alt="html" />
								<div className="card-body d-flex flex-column justify-content-between">
									<h3 className="card-title fs-4 fw-bold">Websites for Beginners</h3>
									<p className="card-text"><strong>NO CODING EXPERIENCE REQUIRED.</strong> By the end of this course, you will be able to describe how the world wide web works and have a basic understanding of the internet. You would have designed and built your own multi-page website, select a hosting service, and publish your hand-made website for the world to see.</p>
									{/* <p className="d-grid">
										<a rel='noreferrer' href="http://grithub-za-1.hubspotpagebuilder.com/websites-for-beginners" target="_blank" className="btn btn-success btn-lg">
											Register Now &nbsp;&rsaquo;
										</a>
									</p> */}
									<div className="alert alert-secondary text-center" role="alert">
										Registration Opens April 2032
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>






				<section className="container-fluid d-flex justify-content-center align-items-center py-5 flex-column bg-info" id="incubator">
					<h2 className="fw-bold display-5 mt-5 mb-4 text-center text-white">Small Business &amp; Entrepreneur Incubator</h2>
					<div className="text-center col-xl-9 col-12 mb-5">
						<p className="lead text-white ">
							Our Incubator is custom designed for Small to Medium Enterprises to help grow digital skills, refine or create an online business model through masterclasses, workshops, events and direct coaching. 
							<br />
							<br/>
							<a className="text-white border-bottom text-decoration-none" href="/whitepapers/BusinessIncubators-TheMissingLinktoSmallBusinessSurvival.pdf" target="_blank" rel="noreferrer" title="white paper on small business survival">White Paper: Business Incubators: The Missing Link to Small Business Survival &rsaquo;</a>
						</p>
					</div>

					<div className="col-12  d-flex justify-content-between flex-wrap">
						<div className="col-xl-4 col-md-6 col-12 p-md-5 p-3">
							<div className="card shadow h-100 align-items-center">
								<Image src="/assets/power.svg" width={150} height={150} className={Style.cardTopOverflow} alt="SME Coaching" />
								<div className="card-body d-flex flex-column justify-content-between">
									<h3 className="card-title fs-4 fw-bold">SME Digital Transformation &amp; Coaching</h3>
									<p className="card-text">The Small to Medium Enterprises in South Africa are the backbone of its economy. SMEs have the ability to quickly adapt to new innovative tools and competencies to propel sector growth. Our goal is to coach and provide tools and information platforms to increase productivity and innovation.</p>
									<a className="text-decoration-underline" href="/whitepapers/eBook-SMB-of-the-Future-FINAL-2019-07-29.pdf" target="_blank" rel="noreferrer" title="whitepaper on digital transformation">White Paper: 7 Trends Driving SMEs’ Digital Transformation &rsaquo;</a>
								</div>
							</div>
						</div>

						<div className="col-xl-4 col-md-6 col-12 p-md-5 p-3">
							<div className="card shadow h-100 align-items-center">
								<Image src="/assets/worker.svg" width={150} height={150} className={Style.cardTopOverflow} alt="Digital Skills"/>
								<div className="card-body d-flex flex-column justify-content-between">
									<h3 className="card-title fs-4 fw-bold">Digital Skills &amp; Apprenticeships</h3>
									<p className="card-text">Our Apprenticeships and Skills training will fill the immediate needs of employers in an ever increasing digital economy.  From CompTIA A+ and Mac Circuitry Certifications, to various scripting Languages, Cloud Computing, Data Analytics and OS Certifications we will thoroughly equip the next digital workforce.</p>
									<a className="text-decoration-underline" href="/whitepapers/skills_boost_western_cape_-_summary_report.pdf" target="_blank" rel="noreferrer" title="whitepaper on digital skills jobs">White Paper: Western Cape Digital Skills Shared Agenda for Action &rsaquo;</a>
								</div>
							</div>
						</div>

						<div className="col-xl-4 col-md-6 col-12 p-md-5 p-3">
							<div className="card shadow h-100 align-items-center">
								<Image src="/assets/3d-printer.svg" width={150} height={150} className={Style.cardTopOverflow} alt="FabLab Innovation"/>
								<div className="card-body d-flex flex-column justify-content-between">
									<h3 className="card-title fs-4 fw-bold">FabLab Innovation Centre</h3>
									<p className="card-text">Disruptive Technologies like "Additive Manufacturing" or 3D Printing, paired with the sharp removal of its price barrier, allows young entrepreneurs to enter previously closed markets. Our <a className="text-decoration-underline" href="https://fabfoundation.org/" target="_blank" rel="noreferrer">Digital Fabrication Lab (FabLab)</a> will assist in product development, rapid tooling and prototyping as well as learning new business models.</p>
									<a className="text-decoration-underline" href="/whitepapers/1-s2.0-S0040162520313093-main.pdf" target="_blank" rel="noreferrer" title="whitepaper on 3d printing">White Paper: The Effect of 3D Printing Technologies on Entrepreneurship &rsaquo;</a>
								</div>
							</div>
						</div>


						<div className="d-md-flex d-xs-none d-xl-none col-xl-4 col-md-6 col-12 p-md-5 p-3  justify-content-center flex-column align-item-center">
							<h3 className="display-6 fw-bold text-white">...And more bespoke programs to meet your industry needs</h3>
							<p className="lead text-white">Our programs, conferences and talks from world renown industry professionals will help drive you and your company to the next level.</p>
						</div>

					</div>
				</section>




				
				<section className="container-fluid d-flex justify-content-between align-items-center p-5 flex-column bg-secondary bg-gradient" id="coworking">
					<div className="col-12 d-flex align-items-center flex-column">
						<h2 className="fw-bold display-5 mt-5 mb-4 text-center text-white">Coworking Office &amp; Event Spaces</h2>
						<div className="col-md-9 col-12 mb-5">
							<p className="lead text-white text-center">Fully furnished and modern coworking and meeting spaces to inspire creativity and promote cluster collaboration.  Our spaces will provide a productive and secure work environment giving you the opportunity to network with like minded people. </p>
							<p className="lead text-white text-center">
								<a className="text-white border-bottom text-decoration-none" href="/whitepapers/Harnessing_the_Potential_of_Coworking.pdf" target="_blank" rel="noreferrer" title="white the power of coworking">White Paper: Harnessing the Power of Coworking &rsaquo;</a>
								&nbsp; &nbsp; &nbsp; 
								<a className="text-white border-bottom text-decoration-none" href="/whitepapers/The-Future-of-Coworking-White-Paper-OpenWork-Agency-May-29-2020.pdf" target="_blank" rel="noreferrer" title="white paper on coworking future">White Paper: COVID-19 and The Future of Coworking &rsaquo;</a>
							</p>
						</div>

						<div className="col-12 d-flex flex-wrap">
							<div className="col-xl-3 col-md-6 col-12 p-4 d-flex flex-column align-items-center">
								<Image src="/assets/wifi_tethering.svg" width={50} height={50} className={Style.whiteIcon} alt="wifi"/>
								<p className="lead text-white pt-3 text-center">200 Mbs Fast Fiber. Audio, Video and Podcasting Equipment. Charging Stations.</p>
							</div>
							<div className="col-xl-3 col-md-6 col-12 p-4 d-flex flex-column align-items-center">
								<Image src="/assets/presentation.svg" width={50} height={50} className={Style.whiteIcon} alt="conference rooms"/>
								<p className="lead text-white pt-3 text-center">Modern Conference Room, Meeting &amp; Board Room and Focus Room. Private Office suites available</p>
							</div>
							{/* <div className="col-xl-3 col-md-6 col-12 p-4 d-flex flex-column">
								<Image src="/assets/build.svg" width={50} height={50} className={Style.whiteIcon} alt="fablabs"/>
								<p className="lead text-white pt-3">FabLabs Network. 3D Printer. Laser Cutter. Vinyl cutter. 3D scanner. Thermoforming machine. CNC Milling Machine.</p>
							</div> */}
							<div className="col-xl-3 col-md-6 col-12 p-4 d-flex flex-column align-items-center">
								<Image src="/assets/airport_shuttle.svg" width={50} height={50} className={Style.whiteIcon} alt="safe"/>
								<p className="lead text-white pt-3 text-center">Accessible to public transport. Safe metro area where all patrons will feel comfortable and inspire creativity.</p>
							</div>
							{/* <div className="col-xl-3 col-md-6 col-12 p-4 d-flex flex-column">
								<Image src="/assets/child_friendly.svg" width={50} height={50} className={Style.whiteIcon} alt="daycare"/>
								<p className="lead text-white pt-3">Child Daycare &amp; Digital Playroom and youth services for business minded families who need support.</p>
							</div> */}
							{/* <div className="col-xl-3 col-md-6 col-12 p-4 d-flex flex-column">
								<Image src="/assets/laptop_mac.svg" width={50} height={50} className={Style.whiteIcon} alt="mac repair"/>
								<p className="lead text-white pt-3">Free Apprenticeship procured PC &amp; Mac repair and IT service. Client just has to pay for parts.</p>
							</div> */}
							<div className="col-xl-3 col-md-6 col-12 p-4 d-flex flex-column align-items-center">
								<Image src="/assets/fingerprint.svg" width={50} height={50} className={Style.whiteIcon} alt="secure"/>
								<p className="lead text-white pt-3 text-center">Security and controlled access. Cleaning and maintenance services. Contingency for electricity failure.</p>
							</div>
							{/* <div className="col-xl-3 col-md-6 col-12 p-4 d-flex flex-column">
								<Image src="/assets/local_cafe.svg" width={50} height={50} className={Style.whiteIcon} alt="office facilities"/>
								<p className="lead text-white pt-3">Copying, printing and scanning facilities. Reception &amp; Mail Services.</p>
							</div> */}
						</div>
					</div>
				</section>
			</main>

			<FooterNav />


			<Helmet>
				<script type="application/ld+json">
					{StructuredJSON()}
				</script>
			</Helmet>
		</>
	)
}

