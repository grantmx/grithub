"use client";

import Header from "components/layout/Header";
import MainNav from "components/layout/MainNav";
import SecondaryNav from "components/layout/SecondaryNav";
import { DefaultSeo } from "next-seo";
import ToolBar from "./Toolbar";

import Style from "./Layout.module.scss"


function Layout({ children }){
    return (
        <>
            <DefaultSeo titleTemplate = '%s | GRITHub Admin' />

            <main className={Style.block}>
                <MainNav />
                
                <div className={Style.outer}>
                    <ToolBar />

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