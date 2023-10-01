import Style from "./styles/Handheld.module.scss"
import utils from "ui/styles/globals/utils.module.scss"

import Grid from "ui/components/layout/Grid";
import GridColumn from "ui/components/layout/GridColumn";
import Header from "./Header";
import Card from "ui/components/display/Card";
import Link from "next/link";
import useCurrent from "./hooks/useCurrent";
import clsx from "clsx";
import ButtonRow from "./ButtonRow";
import useNFCReader from "ui/components/media/NFCReader/useNFCReader";
import { useEffect, useState } from "react";


function AutomationOptions({ step }){
    useCurrent(step)
    const [ nfcSupport, setNfcSupport ] = useState(false)

    const nfc = useNFCReader()

    useEffect(() => {
        setNfcSupport(nfc?.supported)

    }, [ nfc ])


    return(
        <Grid>
            <GridColumn start={2} end={10} className={Style.col}>
                <Header>
                    Tap or Scan to Register
                </Header>

                <aside className={Style.row}>
                    
                    <Card noMargin theme="opaque" className={clsx(Style.touchCard, utils.me_3, !nfcSupport && Style.notSupported)}>
                        <Link className={Style.cardLink}  href={{ href: "handheld", query: { goto: 8, current: 6 }}} onClick={(e) =>{ if(!nfcSupport) e.preventDefault() }}>
                            <svg viewBox="0 0 24 24"  className={Style.cardIcon}>
                                <path d="M17.016 1.031c1.078 0 1.969 0.891 1.969 1.969v17.016c0 1.078-0.891 1.969-1.969 1.969h-2.109c-0.094-1.406-0.422-2.719-0.938-3.984h3.047v-12.984h-10.031v6c-0.656-0.281-1.266-0.516-1.969-0.656v-7.359c0-1.078 0.891-2.016 1.969-2.016zM2.016 12c6.094 0 10.969 4.922 10.969 11.016h-1.969c0-4.969-4.031-9-9-9v-2.016zM2.016 20.016c1.641 0 3 1.359 3 3h-3v-3zM2.016 15.984c3.891 0 6.984 3.141 6.984 7.031h-2.016c0-2.766-2.203-5.016-4.969-5.016v-2.016z"></path>
                            </svg>

                            <h2 className={Style.cardHeading}>
                                Tap your member card
                            </h2>
                        </Link>
                    </Card>
                    
                    

                    <Card noMargin theme="opaque" className={clsx(Style.touchCard, utils.ms_3)}>
                        <Link className={Style.cardLink}  href={{ href: "handheld", query: { goto: 7, current: 6 }}}>
                            <svg viewBox="0 0 32 32"  className={Style.cardIcon}>
                                <path d="M10 2h-8v8h8v-8zM12 0v0 12h-12v-12h12zM4 4h4v4h-4zM30 2h-8v8h8v-8zM32 0v0 12h-12v-12h12zM24 4h4v4h-4zM10 22h-8v8h8v-8zM12 20v0 12h-12v-12h12zM4 24h4v4h-4zM14 0h2v2h-2zM16 2h2v2h-2zM14 4h2v2h-2zM16 6h2v2h-2zM14 8h2v2h-2zM16 10h2v2h-2zM14 12h2v2h-2zM14 16h2v2h-2zM16 18h2v2h-2zM14 20h2v2h-2zM16 22h2v2h-2zM14 24h2v2h-2zM16 26h2v2h-2zM14 28h2v2h-2zM16 30h2v2h-2zM30 16h2v2h-2zM2 16h2v2h-2zM4 14h2v2h-2zM0 14h2v2h-2zM8 14h2v2h-2zM10 16h2v2h-2zM12 14h2v2h-2zM18 16h2v2h-2zM20 14h2v2h-2zM22 16h2v2h-2zM24 14h2v2h-2zM26 16h2v2h-2zM28 14h2v2h-2zM30 20h2v2h-2zM18 20h2v2h-2zM20 18h2v2h-2zM22 20h2v2h-2zM26 20h2v2h-2zM28 18h2v2h-2zM30 24h2v2h-2zM18 24h2v2h-2zM20 22h2v2h-2zM24 22h2v2h-2zM26 24h2v2h-2zM28 22h2v2h-2zM30 28h2v2h-2zM20 26h2v2h-2zM22 28h2v2h-2zM24 26h2v2h-2zM26 28h2v2h-2zM20 30h2v2h-2zM24 30h2v2h-2zM28 30h2v2h-2z"></path>
                            </svg>
                            
                            <h2 className={Style.cardHeading}>
                                Scan your member QR code
                            </h2>
                        </Link>
                    </Card>
                </aside>

                <ButtonRow 
                    back={1} 
                    next={null} 
                    current={6} 
                />

            </GridColumn>
        </Grid>
    )
}


export default AutomationOptions;