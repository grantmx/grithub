import utils from "ui/styles/globals/utils.module.scss"
import Style from "./styles/Handheld.module.scss"

import SignatureCanvas from 'react-signature-canvas'
import Grid from 'ui/components/layout/Grid';
import GridColumn from 'ui/components/layout/GridColumn';
import { useRef, useState } from 'react';
import ButtonRow from './ButtonRow';
import useCurrent from "./hooks/useCurrent";
import Header from "./Header";
import { useRouter } from 'next/navigation'
import Modal from "ui/components/feedback/Modal";
import clsx from "clsx";


function Sign({ step }){
    useCurrent(step)
    const signPad = useRef()
    const router = useRouter()
    const [ open, setOpen ] = useState(false)

    function clear(){
        signPad.current.clear()
    }

    function ok(){
        const dataURL = signPad.current.toDataURL()
        console.log(dataURL)

        setOpen(true)

        setTimeout(() => {
            router.push("/handheld?goto=99")
            setOpen(false)

        }, 2000)
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

                    <ButtonRow back={2} next={null} current={3} />
                </form>
            </GridColumn>

            <Modal size="sm" shouldOpen={open} useHeader={false} willClose={() => null}>
                <div className={Style.counterCntr}>
                    <svg id="icon-check" viewBox="0 0 24 24" className={Style.successIcon}>
                        <path d="M9 16.172l10.594-10.594 1.406 1.406-12 12-5.578-5.578 1.406-1.406z"></path>
                    </svg>
                </div>

                <article className={clsx(Style.modalBlock, Style.modalTopIcon)}>
                    <h1 className={Style.modalHeading}>
                        Sweet. Thanks!
                    </h1>
                </article>
            </Modal>
        </Grid>
    )
}


export default Sign;