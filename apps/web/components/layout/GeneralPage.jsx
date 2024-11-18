import Style from './page.module.scss'
import MainNav from "../navigation/MainNav";
import FooterNav from '../navigation/FooterNav';
import clsx from 'clsx';


function GeneralPage({ 
    metaTitle, 
    title, 
    subTitle, 
    children, 
    image, 
    centerTitle = false, 
    className,
    openGraph = null,
}){

    return(
        <>
            <main className="container-fluid d-flex p-0 flex-column">
                <section className={Style.heroWrapper} style={{backgroundImage: `url( ${image?.src ?? "/assets/hero.jpg" })`}}>
                    <div className={Style.hero}>
                        <MainNav page />

                        <div className={clsx(Style.headingWrapper, centerTitle && Style.centerHeading, className)}>
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