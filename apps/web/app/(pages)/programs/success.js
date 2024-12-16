import Style from 'styles/home.module.scss';
import Image from 'next/image';
import { StructuredJSON } from 'components/StructuredJSON';
import MainNav from 'components/navigation/MainNav';
import FooterNav from 'components/navigation/FooterNav';
import hero from "public/assets/hero.jpg" 
import { Script } from 'next/script';
import CelebrationSuccess from 'components/feedback/CelebrationSuccess';


export const metadata = {
	title: "Success",
}


export default function Success(){
	return(
		<>
			<CelebrationSuccess />

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


			<Script type="application/ld+json">
				{StructuredJSON()}
			</Script>
		</>
	)
}

