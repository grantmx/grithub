import Style from "styles/Handheld.module.scss"
import utils from "ui/styles/globals/utils.module.scss"
import logo from "ui/assets/GRITHUB-logo-white-cutout-solo.svg"

import React from "react";
import Grid from "ui/components/layout/Grid";
import GridColumn from "ui/components/layout/GridColumn";
import Input from "ui/components/form/Input";
import PhoneInput from "ui/components/form/PhoneInput";
import clsx from "clsx";
import Link from "next/link";
import Image from "next/image";


function Form(){
    return(
        <Grid>
            <GridColumn start={3} end={9} className={Style.col}>
                <form className={utils.w_100}>
                    <div className={clsx(utils.w_100, utils.text_center, utils.mb_1)}>
                        <Image src={logo} width={150} height={150} />
                    </div>

                    <h1 className={Style.heading}>
                        Let us know about you.
                    </h1>

                    <fieldset>
                        <div className={clsx(utils.w_100, utils.d_flex, utils.mb_4)}>
                            <div className={clsx(utils.w_50, utils.me_2)}>
                                <Input label="First Name" controlClass={Style.control} />
                            </div>

                            <div className={clsx(utils.w_50, utils.ms_2)}>
                                <Input label="Last Name" controlClass={Style.control}/>
                            </div>
                        </div>

                        <div className={clsx(utils.w_100, utils.d_flex, utils.mb_4)}>
                            <Input label="Email Address" controlClass={Style.control}/>
                        </div>

                        <div className={clsx(utils.w_100, utils.d_flex, utils.mb_4)}>
                            <div className={clsx(utils.w_50, utils.me_2)}>
                                <Input label="Business Name" controlClass={Style.control}/>
                            </div>

                            <div className={clsx(utils.w_50, utils.ms_2)}>
                                <PhoneInput label="Phone" controlClass={Style.control} placeholder="" />
                            </div>
                        </div>

                        <div className={Style.buttonRow}>
                            <Link  href={{ href: "handheld", query: { step: null }}} role="button" className={Style.transButton}>
                                <svg id="icon-arrow-left-circle" viewBox="0 0 24 24" width="80" height="80" fill="#fff">
                                    <path d="M12 1c-6.1 0-11 4.9-11 11s4.9 11 11 11 11-4.9 11-11-4.9-11-11-11zM12 21c-5 0-9-4-9-9s4-9 9-9c5 0 9 4 9 9s-4 9-9 9z"></path>
                                    <path d="M16 11h-5.6l2.3-2.3c0.4-0.4 0.4-1 0-1.4s-1-0.4-1.4 0l-4 4c-0.1 0.1-0.2 0.2-0.2 0.3-0.1 0.2-0.1 0.5 0 0.8 0.1 0.1 0.1 0.2 0.2 0.3l4 4c0.2 0.2 0.5 0.3 0.7 0.3s0.5-0.1 0.7-0.3c0.4-0.4 0.4-1 0-1.4l-2.3-2.3h5.6c0.6 0 1-0.4 1-1s-0.4-1-1-1z"></path>
                                </svg>
                                &nbsp; Back
                            </Link>

                            <Link  href={{ href: "handheld", query: { step: 2 }}} role="button" className={Style.transButton}>
                                Next &nbsp;
                                <svg id="icon-arrow-right-circle" viewBox="0 0 24 24" width="80" height="80" fill="#fff">
                                    <path d="M12 1c-6.1 0-11 4.9-11 11s4.9 11 11 11 11-4.9 11-11-4.9-11-11-11zM12 21c-5 0-9-4-9-9s4-9 9-9c5 0 9 4 9 9s-4 9-9 9z"></path>
                                    <path d="M16.9 11.6c-0.1-0.1-0.1-0.2-0.2-0.3l-4-4c-0.4-0.4-1-0.4-1.4 0s-0.4 1 0 1.4l2.3 2.3h-5.6c-0.6 0-1 0.4-1 1s0.4 1 1 1h5.6l-2.3 2.3c-0.4 0.4-0.4 1 0 1.4 0.2 0.2 0.5 0.3 0.7 0.3s0.5-0.1 0.7-0.3l4-4c0.1-0.1 0.2-0.2 0.2-0.3 0.1-0.3 0.1-0.5 0-0.8z"></path>
                                </svg>
                            </Link>
                        </div>
                    </fieldset>
                </form>
            </GridColumn>
        </Grid>
    )
}

export default Form;