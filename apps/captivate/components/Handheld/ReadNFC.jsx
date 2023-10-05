import Style from "./styles/Handheld.module.scss"

import Grid from "ui/components/layout/Grid";
import GridColumn from "ui/components/layout/GridColumn";
import Header from "./Header";
import { useRouter } from 'next/navigation'
import Modal from "ui/components/feedback/Modal";
import clsx from "clsx";
import useNFCReader from "ui/components/media/NFCReader/useNFCReader";
import { useEffect, useState } from "react";
import cardPayment from "public/assets/card-payment.png"
import Image from "next/image";


function ReadNFC(){
    const router = useRouter();
    const nfc = useNFCReader()
    
    const [ info, setInfo ] = useState({
        title: null,
        message: null,
        icon: null
    })


    useEffect(() => {
        
        if( Array.isArray(nfc?.results) && nfc?.results.length ){
            setInfo({
                title: "Hey, Marshall",
                message: "You have been checked in.",
                icon: "success"
            })

            setTimeout(() => {
                router.push("/handheld?goto=98")
            }, 2000)

        }
        
        if( !!nfc.error ){ 
            setInfo({
                title: "Hey, There...",
                message: nfc.error,
                icon: "error"
            })

            setTimeout(() => {
                router.push("/handheld?goto=6")
            }, 4000)
        }

        
    }, [ nfc.results, nfc.error ])


    return(
        <>
            <Grid>
                <GridColumn start={2} end={20} className={Style.col}>
                    <Header>
                        Tap your member card
                    </Header>

                    <div className={clsx(Style.row, Style.tapArea)}>
                        <Image src={cardPayment} width={300} height={300} alt="tap to join" />
                    </div>
                </GridColumn>
            </Grid>
            
            <Modal size="sm" shouldOpen={!!info.message} useHeader={false} willClose={() => null}>
                <div className={Style.counterCntr}>
                    {info.icon === "success" ? (
                        <svg id="icon-check" viewBox="0 0 24 24" className={Style.successIcon}>
                            <path d="M9 16.172l10.594-10.594 1.406 1.406-12 12-5.578-5.578 1.406-1.406z"></path>
                        </svg>
                    ):(
                        <svg id="icon-close" viewBox="0 0 24 24" className={Style.errorIcon}>
                            <path d="M18.984 6.422l-5.578 5.578 5.578 5.578-1.406 1.406-5.578-5.578-5.578 5.578-1.406-1.406 5.578-5.578-5.578-5.578 1.406-1.406 5.578 5.578 5.578-5.578z"></path>
                        </svg>
                    )}
                </div>

                <article className={clsx(Style.modalBlock, Style.modalTopIcon)}>
                    <h1 className={Style.modalHeading}>
                        {info.title}
                    </h1>
                    
                    <p>{info.message}</p>
                </article>
            </Modal>
        </>
    )
}


export default ReadNFC;