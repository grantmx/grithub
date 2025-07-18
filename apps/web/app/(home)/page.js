/* eslint-disable react/no-unescaped-entities */
import Style from './home.module.scss';
import Image from 'next/image';
import { StructuredJSON } from '../../components/schema/StructuredJSON';
import MainNav from '../../components/navigation/MainNav';
import FooterNav from '../../components/navigation/FooterNav';
import clsx from 'clsx';
import Script from 'next/script'

import afriLabs from "/public/assets/partners/afrilabs-member-logo-white.png" 
import silicon from "/public/assets/silicon-cape-white.svg" 
import georgeBusiness from '/public/assets/partners/georgebusinesschamberlogo.png'
import mosselBay from "/public/assets/partners/mosselbay-chamber.png"
import internship from "/public/assets/winter-internship-blank.jpg" 
import hero from "/public/assets/hero.jpg" 
import heroMobile from "/public/assets/hero-mobile.jpg"
import Link from 'next/link';
import { getLatestPosts } from "services/sanity/sanity.service";
import NewsroomPod from '@/components/newsroom/NewsroomPod';

export const revalidate = 3600

export const metadata = {
	alternates: {
		canonical: 'https://grithub.org.za/'
	}
}

export default async function Home(){
	const { src, blurDataURL, height, width  } = hero;	
    const latest = await getLatestPosts({ start: 0, end: 3 })

	return(
		<>
			<main className="container-fluid d-flex p-0 flex-column">
				<section className={Style.heroWrapper}>
					<picture>
						<source srcSet={src ?? blurDataURL} media="(min-width: 600px)" />
						<source srcSet={heroMobile.src ?? heroMobile.blurDataURL} media="(max-width: 600px)" />

						<Image 
							srcSet={`${heroMobile.src ?? heroMobile.blurDataURL} ${heroMobile.width}w, ${src ?? blurDataURL} ${width}w`}
							className={Style.heroImg} 
							sizes={`(max-width: 600px) ${heroMobile.width}px, ${width}px`}
							{...{ src, blurDataURL, height, width }}
							alt="See your future ahead of you" 
							priority={true}
							placeholder='blur'
						/>
					</picture>

					<div className={Style.hero}>
						<MainNav clear />

						<div className="col-11 col-md-7 ps-md-5 ps-3 ms-md-2 ms-xl-0 mt-md-5">
							<p className={Style.heroHashTag}>#GRITHub</p>
							<p className={Style.heroText}>Catalyzing innovation, entrepreneurship, and an inclusive workforce in the digital economy.</p>
						</div>


						<div className={clsx(Style.heroPartners, ["ps-md-5", "ps-3, d-none d-md-block"])}>
							<small className="text-white w-100 mb-2">
								Our strategic partners and stakeholders
							</small>

							<div className="col-12 d-flex justify-content-start align-items-center flex-wrap">
								<div className="col-4 col-md-4 pe-5 d-none d-md-block">
									<a title="AfriLabs Hub Member" href="https://afrilabs.com" target="_blank" className="d-block" rel="noreferrer">
										<Image 
											src={afriLabs}
											alt="AfriLabs" 
											className={clsx(Style.partnerLogo, Style.whiteLogo)}
										/>
									</a>
								</div>

								<div className="col-4 col-md-4 pe-5 d-none d-md-block">
									<Image 
										src={silicon}
										alt="Silicon cape" 
										className={clsx(Style.partnerLogo, Style.whiteLogo)}
									/>
								</div>


								<div className="col-4 col-md-4 px-5 d-none d-md-block">
									<a title="coder dojo" href="https://zen.coderdojo.com/dojos/za/george-municipality/george-western-cape-garden-route-innovation-and-technology-hub" target="_blank" className="d-block" rel="noreferrer" >
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

								<div className="col-4 col-md-4 px-5 d-none d-md-block">
									<a title="sevengage proud supporter" href="https://sevengage.com" target="_blank" className="d-block" rel="noreferrer">
										<Image 
											src="/assets/partners/sevengage-logo.svg" 
											width={250} 
											height={75} 
											alt="Sevengage, Inc." 
											className={Style.partnerLogo}
										/>
									</a>
								</div>
								
								<div className="col-4 col-md-3 pe-5 pt-5 d-none d-md-block">
									<a title="george business chamber member" href="https://georgechamber.co.za/" target="_blank" className="d-block" rel="noreferrer">
										<Image 
											src={georgeBusiness}
											alt="George Business Chamber." 
											className={Style.partnerLogo}
										/>
									</a>
								</div>

								<div className="col-4 col-md-4 px-5 pt-5 d-none d-md-block">
									<a title="mossel bay business chamber member" href="https://mosselbaychamber.co.za/" target="_blank" className="d-block" rel="noreferrer">
										<Image 
											src={mosselBay}
											alt="Mossel Bay Business Chamber" 
											className={Style.partnerLogo}
										/>
									</a>
								</div>

								
							</div>
						</div>
					</div>
				</section>



				<section className='bg-light py-5 mb-5'>
					<div className="col-12 px-4 d-flex justify-content-center flex-column flex-md-row">

						<div className="col-md-5 col-12 py-md-3 py-3 pe-3 pe-md-3 d-flex justify-content-center flex-column text-center">
							<span className="lead text-muted">GRIT Hub Innovative 2025 Ideas Competition</span>
							<p className="fw-bold display-3 mb-3">
								What is your BIG Innovative Idea?
							</p>
							<p className='lead'>
								Do you have a big idea that you believe can change the world? Enter the 2025 GRIT Hub Innovative Ideas Competition and stand a chance to win a cash prize of R10,000 and mentorship to bring your idea to life.
							</p>
							
							<p>
								<Link href="/programs/incubation/competition" className="btn rounded-pill btn-danger btn-lg px-4" title='apply today'>
									Learn more &nbsp;&rsaquo;
								</Link>
							</p>
						</div>


						<div className="col-md-6 col-12 p-md-5 py-3 d-flex justify-content-end flex-row">
							<Link href="/programs/incubation/competition" title="apply today">
								<Image 
									src="/assets/nmu-idea-compeition-web-2025.jpg" 
									width={711} 
									height={400}
									className={Style.adImg}
									alt="grit internship"
								/>
							</Link>
						</div>

					</div>
				</section>




				<section className="container-xxl col-12 d-flex justify-content-center align-items-center p-4 p-md-5 flex-column" id="about">
					<h1 className="fw-bold display-4 mb-1 text-center">Garden Route Innovation &amp; Technology Hub</h1>

					<div className="text-center col-xl-12 col-12">
						<p className='lead text-muted fs-3'>We provide workforce training, apprenticeships, tools, and mentorship opportunities to individuals, small businesses and startups in the Garden Route area...and all it takes is GRIT and determination. </p>
						{/* <p>Our duty is to empower community members and small businesses to actively participate in the local supply chain through collaborations with academia, business and government partners using modern technology and innovation.</p> */}
					</div>
				</section>


				
				<section className="container-xxl col-12 d-flex justify-content-center align-items-center p-0 mb-5 flex-column">
					<div className="col-12 d-flex flex-wrap">

						<div className="col-xl-4 col-md-6 col-12 p-2">
							<div className="card shadow-sm h-100">
								<Link href="/cowork" title='coworking spaces'>
									<Image src="/assets/IMG_7441.jpg" width={500} height={333} className={Style.cardTopImg} alt="About our coworking spaces"/>
								</Link>
								<div className="card-body d-flex flex-column">
									<h2 className="card-title fs-4 fw-bold">Coworking</h2>
									<p className="card-text">Modern, sleek and creative spaces fostering collaboration and productivity so that you can work without distraction. <Link href="/cowork" className="text-decoration-underline" title="more about coworking">More &rsaquo;</Link></p>
								</div>
							</div>
						</div>

						<div className="col-xl-4 col-md-6 col-12 p-2">
							<div className="card shadow-sm h-100">
								<Link href="/programs" title="programs">
									<Image src="/assets/workshop-thumb-2.jpg" width={500} height={333} className={Style.cardTopImg} alt="Workshops and Programs" />
								</Link>
								<div className="card-body d-flex flex-column">
									<h2 className="card-title fs-4 fw-bold">Real Workforce Training</h2>
									<p className="card-text">Programing and Industry workshops using the latest real-world knowledge from industry experts. <Link href="/programs" className="text-decoration-underline" title="more about programs">More &rsaquo;</Link></p>
								</div>
							</div>
						</div>

						<div className="col-xl-4 col-md-6 col-12 p-2">
							<div className="card shadow-sm h-100">
								<Link href="/incubation" title="smme incubator">
									<Image src="/assets/incubator-thumb.jpg" width={500} height={333} className={Style.cardTopImg} alt="Entrepreneurship Incubation" />
								</Link>
								<div className="card-body d-flex flex-column">
									<h2 className="card-title fs-4 fw-bold">Entrepreneurship Incubation</h2>
									<p className="card-text">Tailored workshops, networking, online learning and hands-on mentorship for accelerating business growth. <Link href="/incubation" className="text-decoration-underline" title="more about incubation">More &rsaquo;</Link></p>
								</div>
							</div>
						</div>

						

						<div className="d-md-flex d-xs-none d-xl-none col-xl-4 col-md-6 col-12 p-md-5 p-4 justify-content-center flex-column align-item-center">
							<h2 className="display-6 fw-bold">We strive for wholistic change at every level of the economy.</h2>
							<p className="lead">Our core values of: Collaboration, Equality, Responsibility, Entrepreneurial Ethic, Innovation and a Giving Spirit not only bind us, but guide us.</p>
						</div>

					</div>
				</section>



				<section className="container-xxl col-12 d-flex justify-content-center align-items-center p-0 mb-5 flex-column">
					<h2 className="fw-bold display-5 mt-5 mb-0 text-center">
						Up Coming Trainings, Courses & Programs
					</h2>

					<p className="lead text-muted fs-3 text-center mb-5">
						Identifying untapped inclusive human potential and refocusing it using the power of digital technology. &nbsp; 
						<a href="/programs" title="learn more about our programs">View All Workforce Trainings and Programs &rsaquo;</a>
					</p>


					{/* <div className="col-12 d-flex justify-content-between flex-wrap mb-5">
						<div className="col-xl-4 col-md-6 col-12 p-3">
							<div className="shadow-lg position-relative align-items-center">
								<Link href="/programs/register/masterclass" title="register for masterclass">
									<Image 
										src={masterclassImg.src} 
										width={400} 
										height={400} 
										alt="masterclass" 
										className={Style.adImg}
										placeholder='blur'
										blurDataURL={masterclassImg.blurDataURL}
									/>
								</Link>
							</div>
						</div>


						



						<div className="col-xl-4 col-md-6 col-12 p-3">
							<div className="shadow-lg position-relative align-items-center">
								<a href={`https://wa.me/270448743349?text=${encodeURI(`Hi, I'm looking to book for the AI Prompt Engineering Class at GRIT Hub`)}`} title="register for ai prompt class">
									<Image 
										src={aipromptImg.src} 
										width={400} 
										height={400} 
										alt="ai prompt" 
										className={Style.adImg}
										placeholder='blur'
										blurDataURL={aipromptImg.blurDataURL}
									/>
								</a>
							</div>
						</div>


						<div className="col-xl-4 col-md-6 col-12 p-3">
							<div className="shadow-lg position-relative align-items-center">
								<a href={`https://wa.me/270448743349?text=${encodeURI(`Hi, I'm looking to book for the eCommerce Class at GRIT Hub`)}`} title="register for ecommm class">
									<Image 
										src={ecommImg.src} 
										width={400} 
										height={400} 
										alt="ecommerce class" 
										className={Style.adImg}
										placeholder='blur'
										blurDataURL={ecommImg.blurDataURL}
									/>
								</a>
							</div>
						</div>
					</div> */}
				</section>







				<section className='bg-light py-5 mb-5'>
					<div className="col-12 p-4 d-flex justify-content-center flex-column flex-md-row text-center">
						<div className="col-md-6 col-12 p-md-5 py-3 d-flex justify-content-end flex-row">
							<Link href="/programs/internship" title="apply today">
								<Image 
									src={internship.src}
									blurDataURL={internship.blurDataURL}
									width={711} 
									height={400}
									className={Style.adImg}
									alt="grit internship"
									placeholder='blur'
								/>
							</Link>
						</div>

						<div className="col-md-5 col-12 py-md-5 py-3 d-flex justify-content-center flex-column">
							<span className="lead text-muted">GRIT Hub Internships</span>
							<h2 className="fw-bold display-3 mb-3">
								Get hands on industry experience.
							</h2>
							<p className='lead'>Push yourself and get involved in meaningful real enterprise projects at GRIT Hub.  Apply for the GRIT Internship today.</p>
							
							<p>
								<Link href="/programs/internship" className="btn rounded-pill rounded-pill btn-danger btn-lg px-4" title='apply today'>
									Learn more &nbsp;&rsaquo;
								</Link>
							</p>
						</div>
					</div>
				</section>






				<section className="container-xxl col-12 d-flex justify-content-center align-items-center p-0 mb-5 flex-column">
					<h2 className="fw-bold display-5 mt-5 mb-0 text-center">
						Our Newsroom
					</h2>

					<p className="lead text-muted fs-3 text-center mb-5">
						Stories, Insights, and Opportunities from GRIT Hub's Tech Ecosystem.<br/><a href="/newsroom" title="read all">View all newsroom articles &rsaquo;</a>
					</p>
					
					<div className="col-12 d-flex flex-wrap">
						{latest.map((post) => {
							return(
								<NewsroomPod key={post.slug?.current} {...post} />
							)
						})}
					</div>
				</section>
			</main>


			<FooterNav />

			
			<Script type="application/ld+json">
				{StructuredJSON()}
			</Script>
		</>
	)
}

