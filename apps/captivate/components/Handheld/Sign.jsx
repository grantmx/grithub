import Style from "./styles/Handheld.module.scss"
import Image from "next/image";
import logo from "ui/assets/GRITHUB-logo-white-cutout-solo.svg"
import utils from "ui/styles/globals/utils.module.scss"

import SignatureCanvas from 'react-signature-canvas'
import Grid from 'ui/components/layout/Grid';
import GridColumn from 'ui/components/layout/GridColumn';
import clsx from "clsx";
import { useRef } from 'react';
import ButtonRow from './ButtonRow';
import useCurrent from "./hooks/useCurrent";
import Header from "./Header";


function Sign({ step }){
    useCurrent(step)
    const signPad = useRef()

    function clear(){
        signPad.current.clear()
    }

    function ok(){
        const dataURL = signPad.current.toDataURL()
        console.log(dataURL)
    }



    return(
        <Grid>
            <GridColumn start={2} end={10} className={Style.col}>
                <form className={utils.w_100}>
                    <Header>
                        ...and your signature, please.
                    </Header>

                    <figure className={Style.canvasCntr}>
                        <SignatureCanvas 
                            penColor='blue' 
                            canvasProps={{ className: Style.signature }} 
                            ref={signPad}
                        />
                        
                        <figcaption className={Style.canvasControls}>
                            <button type="button" onClick={clear} className={Style.canvasButton}>
                                Clear
                            </button>

                            <button type="button" onClick={ok} className={Style.canvasButton}>
                                OK
                            </button>
                        </figcaption>
                    </figure>

                    <ButtonRow back={2} next={99} current={3} />
                </form>
            </GridColumn>
        </Grid>
    )
}


export default Sign;