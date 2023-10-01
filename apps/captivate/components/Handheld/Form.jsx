import Style from "./styles/Handheld.module.scss"
import utils from "ui/styles/globals/utils.module.scss"
import logo from "ui/assets/GRITHUB-logo-white-cutout-solo.svg"

import React from "react";
import Grid from "ui/components/layout/Grid";
import GridColumn from "ui/components/layout/GridColumn";
import Input from "ui/components/form/Input";
import PhoneInput from "ui/components/form/PhoneInput";
import clsx from "clsx";
import Image from "next/image";
import ButtonRow from "./ButtonRow";
import useCurrent from "./hooks/useCurrent";
import { useForm, Controller } from "react-hook-form";
import { useEffect } from "react";
import Header from "./Header";


function Form({ step }){
    useCurrent(step)

    const { watch, control } = useForm();

    useEffect(() => {
        const subscription = watch((value, { name, type }) => {  
            console.log(value, name, type)
        })

        return () => subscription.unsubscribe();

    },  [ watch ]);



    return(
        <Grid>
            <GridColumn start={2} end={10} className={Style.col}>
                <form className={utils.w_100}>
                    <Header subText="*Required fields">
                        Tell us about yourself.
                    </Header>

                    <fieldset>
                        <div className={clsx(utils.w_100, utils.d_flex, utils.mb_4)}>
                            <div className={clsx(utils.w_50, utils.me_2)}>
                                <Controller
                                    control={control}
                                    name="first_name"
                                    render={({ field }) => (
                                        <Input 
                                            label="First Name*" 
                                            controlClass={Style.control} 
                                            onChange={field.onChange}
                                            required
                                            {...field}
                                        />
                                    )}
                                />
                            </div>

                            <div className={clsx(utils.w_50, utils.ms_2)}>
                                <Controller
                                    control={control}
                                    name="surname"
                                    render={({ field }) => (
                                        <Input 
                                            label="Surname*" 
                                            onChange={field.onChange}
                                            {...field}
                                            required
                                            controlClass={Style.control}
                                        />
                                    )}
                                />
                            </div>
                        </div>


                        <div className={clsx(utils.w_100, utils.d_flex, utils.mb_4)}>
                            <div className={clsx(utils.w_50, utils.me_2)}>
                                <Controller
                                    control={control}
                                    name="business_name"
                                    render={({ field }) => (
                                        <Input 
                                            label="Business Name" 
                                            onChange={field.onChange}
                                            {...field}
                                            controlClass={Style.control}
                                        />
                                    )}
                                />
                            </div>

                            <div className={clsx(utils.w_50, utils.ms_2)}>
                                <Controller
                                    control={control}
                                    name="phone"
                                    render={({ field }) => (
                                        <PhoneInput 
                                            label="Phone*" 
                                            onChange={field.onChange}
                                            required
                                            {...field}
                                            controlClass={Style.control} 
                                            placeholder="" 
                                        />
                                    )}
                                />
                            </div>
                        </div>


                        <div className={clsx(utils.w_100, utils.d_flex, utils.mb_1)}>
                            <Controller
                                control={control}
                                name="email"
                                render={({ field }) => (
                                    <Input 
                                        label="Email Address*" 
                                        onChange={field.onChange}
                                        required
                                        {...field}
                                        controlClass={Style.control}
                                    />
                                )}
                            />
                        </div>

                        <ButtonRow 
                            back={1} 
                            // next={3} 
                            next={null} 
                            current={2} 
                        />
                    </fieldset>
                </form>
            </GridColumn>
        </Grid>
    )
}

export default Form;