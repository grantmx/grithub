import Style from "./styles/Handheld.module.scss"
import utils from "ui/styles/globals/utils.module.scss"
import qrImage from "public/assets/signup-qr.svg"

import Grid from "ui/components/layout/Grid"
import GridColumn from "ui/components/layout/GridColumn"
import Image from "next/image";
import clsx from "clsx";
import { hubs } from "ui/lib/constants"
import useCurrent from "./hooks/useCurrent"
import Header from "./Header"

function MemberScan({ step }){
    useCurrent(step)

    
    return(
        <Grid>
            <GridColumn start={2} end={10} className={Style.col}>
                <Header subText={<Text />}>
                    Become a member. Scan the code to learn more.
                </Header>

                
                
                <aside className={clsx(Style.row, utils.mb_4)}>
                    <Image 
                        src={qrImage} 
                        width={200} 
                        height={200} 
                        alt="qr code" 
                        className={Style.qrImage} 
                    />
                </aside>
            </GridColumn>
        </Grid>
    )
}


function Text(){
    return(
        <p className={clsx(Style.text, utils.justify_content_center)}>
            <svg id="icon-wifi" viewBox="0 0 24 24" width={20} height={20} fill="#fff">
                <path d="M5.016 12.984c3.891-3.844 10.125-3.844 13.969 0l-1.969 2.016c-2.766-2.766-7.266-2.766-10.031 0zM9 17.016c1.641-1.641 4.359-1.641 6 0l-3 3zM0.984 9c6.094-6.047 15.984-6.047 22.031 0l-2.016 2.016c-4.969-4.969-13.031-4.969-18 0z"></path>
            </svg>

            &nbsp;&nbsp; Need wifi? Connect to: &nbsp; <strong>{hubs.george.wifi}</strong>&nbsp; and use the password, &nbsp;<strong>{hubs.george.wifiPassword}</strong>.
        </p>
    )
    
}


export default MemberScan;