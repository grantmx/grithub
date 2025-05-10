import Style from "./styles/Handheld.module.scss"
import utils from "ui/styles/globals/utils.module.scss"

import Grid from "ui/components/layout/Grid";
import GridColumn from "ui/components/layout/GridColumn";
import Header from "./Header";
import { useRef, useState, useEffect, use } from "react";
import ButtonRow from "./ButtonRow";
import { useRouter } from 'next/navigation'
import Modal from "ui/components/feedback/Modal";
import clsx from "clsx";
import sound from "@/public/assets/store-scanner-beep.mp3"
import useSound from 'use-sound';
import Image from "next/image";
import qrscanimage from "@/public/assets/scan-qr-card.png"



function ScanQRCode(){
    const [ data, setData ] = useState(null);
    const router = useRouter();
    const [ playBeep ] = useSound(sound.src);
    const [ openModal, setOpenModal ] = useState(true)
    const qr = useRef();


    function success(data){
        setData(data);
    }


    useEffect(() => {
        qr.current.focus();

    }, [ ])


    useEffect(() => {
        let redirect = null;

        if( data ){
            redirect = setTimeout(() => {
                setOpenModal(false)
                router.push("/handheld?goto=98")
            }, 5000)
        }
    
        return() => {
            clearTimeout(redirect)
        }

    }, [ data ])


    return(
        <>
            <Grid>
                <GridColumn start={2} end={10} className={Style.col}>
                    <Header subText={<Text />}>
                        Scan Member QR Code
                    </Header>

                    <Image src={qrscanimage.src} width="256" height="137" className={Style.qrScanImg} />

                    <input type="text" name="qr" ref={qr} onChange={success} />

                    <ButtonRow back={6} next={null} current={6} /> 
                </GridColumn>
            </Grid>


            {data && (
                <Modal size="sm" shouldOpen={openModal} useHeader={false} willClose={() => null}>
                    <div className={Style.counterCntr}>
                        <svg id="icon-check" viewBox="0 0 24 24" className={Style.successIcon}>
                            <path d="M9 16.172l10.594-10.594 1.406 1.406-12 12-5.578-5.578 1.406-1.406z"></path>
                        </svg>
                    </div>

                    <article className={clsx(Style.modalBlock, Style.modalTopIcon)}>
                        <h1 className={Style.modalHeading}>
                            Hey, Marshall!
                        </h1>
                        
                        <p>Got your info. Thanks!</p>
                    </article>
                </Modal>
            )}
        </>
    )
}


function Text(){
    return(
        <p className={clsx(Style.text, utils.justify_content_center)}>
           Use our app or member card QR code to sign in.
        </p>
    )
}


export default ScanQRCode;