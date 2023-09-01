import Style from 'styles/home.module.scss';

import Image from 'next/image';
import { Helmet } from 'react-helmet';
import { NextSeo } from 'next-seo';
import { StructuredJSON } from 'components/StructuredJSON';
import MainNav from 'components/navigation/MainNav';
import FooterNav from 'components/navigation/FooterNav';

import hero from "public/assets/hero.jpg" 
import { useEffect } from 'react';
import { celebrationTime } from 'lib/utils/celebrationTime';


export default function Success(){

	useEffect(() => {
		celebrationTime()

	}, [])


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
							<p className={Style.heroHashTag}>Success! </p>
							<p className={Style.heroText}>Thank you for your submission and payment. See you at the start of the course!</p>
                            <p className='lead'>If you have any questions, WhatsApp us at: <a href="https://wa.me/270630705752" target="_blank" rel="noreferrer">063-070-5752</a></p>
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

