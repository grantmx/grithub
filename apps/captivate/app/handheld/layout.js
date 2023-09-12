"use client"

import "ui/styles/globals/global.scss"
import Style from "components/Handheld/styles/Handheld.module.scss"
import backgroundImage from "public/assets/hero-dark.jpg"
import Image from "next/image"
import React from "react"



function handheldLayout({ children }){
    return(
        <main className={Style.block}>
            <div className={Style.wrapper}>
                {children}
            </div>

            <Image 
                className={Style.backgroundImage}
                src={backgroundImage} 
                width={1000} 
                height={1000} 
                alt="grithub"
            />
        </main>
    )
}


export default handheldLayout;