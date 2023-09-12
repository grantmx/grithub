import Style from "./styles/Handheld.module.scss"

import Grid from "ui/components/layout/Grid";
import GridColumn from "ui/components/layout/GridColumn";
import Header from "./Header";
import { useState } from "react";
import QRScanner from "ui/components/media/QRScanner";
import ButtonRow from "./ButtonRow";
import { useRouter } from 'next/navigation'
import Modal from "ui/components/feedback/Modal";
import clsx from "clsx";
import sound from "public/assets/store-scanner-beep.mp3"
import useSound from 'use-sound';
import { useEffect } from "react";


function ScanQRCode(){
    const [ data, setData ] = useState(null);
    const router = useRouter();
    const [ playBeep ] = useSound(sound.src);
    const [ openModal, setOpenModal ] = useState(true)


    function success(data){
        setData(data);
        playBeep()
    }


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
                <GridColumn start={3} end={9} className={Style.col}>
                    <Header>
                        Scan Member QR Code
                    </Header>

                    <div className={Style.row}>
                        <QRScanner onSuccess={success} />
                    </div>               

                    <ButtonRow back={1} next={7} current={6} /> 
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

export default ScanQRCode;