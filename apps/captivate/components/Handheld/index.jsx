import Style from "./styles/Handheld.module.scss"
import utils from "ui/styles/globals/utils.module.scss"

import Grid from "ui/components/layout/Grid"
import GridColumn from "ui/components/layout/GridColumn"
import Card from "ui/components/display/Card";
import Divider from "ui/components/display/Divider";
import Link from "next/link";
import Image from "next/image";
import logo from "ui/assets/grithub-logo-vertical-all-white.svg"
import useCurrent from "./hooks/useCurrent";
import clsx from "clsx";



function Handheld({ step }){
    useCurrent(step)

    return(
        <Grid className={Style.home}>
            <GridColumn start={2} end={6} className={Style.col}>
                <Card theme="opaque" className={clsx(Style.touchCard, utils.mb_4)} noMargin>
                    <Link className={Style.cardLink}  href={{ href: "handheld", query: { goto: 2, current: 1 }}}>
                        <svg id="icon-touch_app" viewBox="0 0 24 24" className={Style.cardIcon}>
                            <path d="M18.844 15.891c0.516 0.234 0.891 0.75 0.891 1.359v0.188l-0.75 5.297c-0.094 0.75-0.703 1.266-1.453 1.266h-6.797c-0.422 0-0.75-0.141-1.031-0.422l-4.969-4.969 0.797-0.797c0.188-0.188 0.469-0.328 0.797-0.328 0.094 0 0.141 0.047 0.234 0.047l3.422 0.703v-10.734c0-0.844 0.656-1.5 1.5-1.5s1.5 0.656 1.5 1.5v6h0.797c0.188 0 0.328 0.047 0.516 0.094zM9 11.25c-1.219-0.797-2.016-2.203-2.016-3.75 0-2.484 2.016-4.5 4.5-4.5s4.5 2.016 4.5 4.5c0 1.547-0.75 2.953-1.969 3.75v-3.75c0-1.359-1.172-2.484-2.531-2.484s-2.484 1.125-2.484 2.484v3.75z"></path>
                        </svg>

                        <div className={Style.helpText}>
                            <h2 className={Style.cardHeading}>
                                Guest Registration
                            </h2>

                            <small className={Style.text}>
                                Joining us for the first time? Register as a guest and get started. You'll have the option to sign up for a FREE membership later.
                            </small>
                        </div>
                    </Link>
                </Card>


                <Card theme="opaque" className={Style.touchCard} noMargin>
                    <Link className={Style.cardLink} href={{ href: "handheld", query: { goto: "entrance-options", current: 1 }}}>
                        <svg id="icon-tap_and_play" viewBox="0 0 24 24" className={Style.cardIcon}>
                            <path d="M17.016 1.031c1.078 0 1.969 0.891 1.969 1.969v17.016c0 1.078-0.891 1.969-1.969 1.969h-2.109c-0.094-1.406-0.422-2.719-0.938-3.984h3.047v-12.984h-10.031v6c-0.656-0.281-1.266-0.516-1.969-0.656v-7.359c0-1.078 0.891-2.016 1.969-2.016zM2.016 12c6.094 0 10.969 4.922 10.969 11.016h-1.969c0-4.969-4.031-9-9-9v-2.016zM2.016 20.016c1.641 0 3 1.359 3 3h-3v-3zM2.016 15.984c3.891 0 6.984 3.141 6.984 7.031h-2.016c0-2.766-2.203-5.016-4.969-5.016v-2.016z"></path>
                        </svg>

                        <div className={Style.helpText}>
                            <h2 className={Style.cardHeading}>
                                GRIT Hub Members
                            </h2>

                            <small className={Style.text}>
                                GRIT Hub Members can speed up their sign-in by using their mobile phone.</small>
                        </div>
                    </Link>
                </Card>
            </GridColumn>

            
            <GridColumn start={6} end={7} className={clsx(Style.col, Style.colDivider)}>
                <Divider orientation="vertical" width="1px" height="100%" color="light" />
            </GridColumn>


            <GridColumn start={7} end={10} className={Style.col}>
                <Image 
                    src={logo} 
                    width="100" 
                    height="200" 
                    className={Style.homeLogo}
                    alt="logo"
                />
            </GridColumn>
        </Grid>
    )
}


export default Handheld