import Style from '../../styles/page.module.scss'
import MainNav from "../navigation/MainNav";
import { NextSeo } from 'next-seo';
import FooterNav from '../navigation/FooterNav';
import OrganizationSchema from '../schema/Organization';
import { useRouter } from "next/router"

function GeneralPage({ title, subTitle, children, image }){
    const router = useRouter()

    return(
        <>
            <NextSeo 
                title={title}
                canonical = {"https://grithub.org.za" + router.pathname}
            />

            <OrganizationSchema />

            <main className="container-fluid d-flex p-0 flex-column">
                <section className={Style.heroWrapper} style={{backgroundImage: `url( ${image?.src ?? "/assets/hero.jpg" })`}}>
                    <div className={Style.hero}>
                        <MainNav page />

                        <div className={Style.headingWrapper}>
                            <h1 className={Style.heading}>
                                {title}
                            </h1>

                            {subTitle && (
                                <p className={Style.subHeading}>
                                    {subTitle}
                                </p>
                            )}
                            
                        </div>
                    </div>
                </section>

                {children}
            </main>

            <FooterNav />
        </>
    )
}

export default GeneralPage;