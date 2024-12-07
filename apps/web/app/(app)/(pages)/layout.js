import FooterNav from '../../../components/navigation/FooterNav';
import MainNav from '../../../components/navigation/MainNav';
import Style from './page.module.scss'


function GeneralPageLayout({ children }){
    return(
        <>
            <main className="container-fluid d-flex p-0 flex-column">
                <section className={Style.heroWrapper}>
                    <div className={Style.hero}>
                        <MainNav page />

                        {/* <div className={clsx(Style.headingWrapper)}>
                            <h1 className={Style.heading}>
                                {title}
                            </h1>

                            {subTitle && (
                                <p className={Style.subHeading}>
                                    {subTitle}
                                </p>
                            )}
                            
                        </div> */}
                    </div>
                </section>

                {children}
            </main>

            <FooterNav />
        </>
    )
}

export default GeneralPageLayout;