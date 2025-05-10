"use client"

import "ui/styles/globals/global.scss"
import Style from "@/components/Handheld/styles/Handheld.module.scss"
import React from "react"



function handheldLayout({ children }){
    return(
        <>
            <main className={Style.main}>
                <section className={Style.block}>
                    <div className={Style.wrapper}>
                        {children}
                    </div>
                </section>
            </main>

            <footer className={Style.footer}>
                <p className={Style.text}>
                    <small>&copy;{new Date().getFullYear()} Garden Route Innovation & Technology Hub, NPC.  All Rights Reserved.</small>
                </p>
            </footer>
        </>
    )
}


export default handheldLayout;