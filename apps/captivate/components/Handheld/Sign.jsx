import SignatureCanvas from 'react-signature-canvas'
import Grid from 'ui/components/layout/Grid';
import GridColumn from 'ui/components/layout/GridColumn';
import Style from "styles/Handheld.module.scss"
import Link from "next/link";
import Image from "next/image";
import logo from "ui/assets/GRITHUB-logo-white-cutout-solo.svg"
import utils from "ui/styles/globals/utils.module.scss"
import clsx from "clsx";
import { useRef } from 'react';


function Sign(){
    const signPad = useRef()

    function clear(){
        signPad.current.clear()
    }

    return(
        <Grid>
            <GridColumn start={3} end={9} className={Style.col}>
                <form className={utils.w_100}>
                    <div className={clsx(utils.w_100, utils.text_center, utils.mb_2)}>
                        <Image src={logo} width={100} height={100} />
                    </div>

                    <h1 className={Style.heading}>
                        Your signature, please.
                    </h1>

                    <fieldset>
                        <SignatureCanvas 
                            penColor='blue' 
                            canvasProps={{ className: Style.signature }} 
                            ref={signPad}
                        />
                    </fieldset>


                    <div className={Style.buttonRow}>
                            <Link  href={{ href: "handheld", query: { step: 1 }}} role="button" className={Style.transButton}>
                                <svg id="icon-arrow-left-circle" viewBox="0 0 24 24" width="50" height="50" fill="#fff">
                                    <path d="M12 1c-6.1 0-11 4.9-11 11s4.9 11 11 11 11-4.9 11-11-4.9-11-11-11zM12 21c-5 0-9-4-9-9s4-9 9-9c5 0 9 4 9 9s-4 9-9 9z"></path>
                                    <path d="M16 11h-5.6l2.3-2.3c0.4-0.4 0.4-1 0-1.4s-1-0.4-1.4 0l-4 4c-0.1 0.1-0.2 0.2-0.2 0.3-0.1 0.2-0.1 0.5 0 0.8 0.1 0.1 0.1 0.2 0.2 0.3l4 4c0.2 0.2 0.5 0.3 0.7 0.3s0.5-0.1 0.7-0.3c0.4-0.4 0.4-1 0-1.4l-2.3-2.3h5.6c0.6 0 1-0.4 1-1s-0.4-1-1-1z"></path>
                                </svg>
                                &nbsp; Back
                            </Link>

                            <Link  href={{ href: "handheld", query: { step: 3 }}} role="button" className={Style.transButton}>
                                Next &nbsp;
                                <svg id="icon-arrow-right-circle" viewBox="0 0 24 24" width="50" height="50" fill="#fff">
                                    <path d="M12 1c-6.1 0-11 4.9-11 11s4.9 11 11 11 11-4.9 11-11-4.9-11-11-11zM12 21c-5 0-9-4-9-9s4-9 9-9c5 0 9 4 9 9s-4 9-9 9z"></path>
                                    <path d="M16.9 11.6c-0.1-0.1-0.1-0.2-0.2-0.3l-4-4c-0.4-0.4-1-0.4-1.4 0s-0.4 1 0 1.4l2.3 2.3h-5.6c-0.6 0-1 0.4-1 1s0.4 1 1 1h5.6l-2.3 2.3c-0.4 0.4-0.4 1 0 1.4 0.2 0.2 0.5 0.3 0.7 0.3s0.5-0.1 0.7-0.3l4-4c0.1-0.1 0.2-0.2 0.2-0.3 0.1-0.3 0.1-0.5 0-0.8z"></path>
                                </svg>
                            </Link>
                        </div>
                </form>
            </GridColumn>
        </Grid>
    )
}


export default Sign;