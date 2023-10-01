"use client"

import "ui/styles/globals/global.scss"
import Style from "components/Handheld/styles/Handheld.module.scss"
import React from "react"



function handheldLayout({ children }){
    return(
        <section className={Style.block}>
            <div className={Style.wrapper}>
                {children}
            </div>
        </section>
    )
}


export default handheldLayout;