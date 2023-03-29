import Header from "components/Layout/Header";
import MainNav from "components/Layout/MainNav";
import SecondaryNav from "components/Layout/SecondaryNav";
import { DefaultSeo } from "next-seo";

import Style from "./Layout.module.scss"


function Layout({ children }){
    return (
        <>
            <DefaultSeo titleTemplate = '%s | GRITHub Admin' />

            <main className={Style.block}>
                <MainNav />
                
                <div className={Style.outer}>
                    <Header />

                    <section className={Style.wrapper}>
                        <SecondaryNav />

                        <div className={Style.inner}>
                            {children}
                        </div>
                    </section>
                </div>
            </main>

        </>
        
    );
}


export default Layout;