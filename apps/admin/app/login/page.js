"use client"

import Style from "./login.module.scss" 

import Card from "components/display/Card"
import Input from "components/form/Input";
import logo from "public/assets/GRITHUB-logo-white-cutout-solo.svg"
import Image from "next/image";
import Button from "components/form/Button";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";


function Page() {
    const router = useRouter()

    const { handleSubmit, control } = useForm({
        mode: "onBlur",
        reValidateMode: 'onChange',
        defaultValues: {
            email: "",
            password: ""
        }
    });


    function onSubmit(formData){
        console.log(formData)

        router.push('/dashboard')
    }



    return(
        <>
            <form className={Style.block} onSubmit={handleSubmit(onSubmit)}>
                <Image 
                    src={logo} 
                    width={200} 
                    height={200} 
                    className={Style.logo}
                    alt="login"
                />

                <Card className={Style.container}>
                    <div className={Style.control}>
                        <Controller
                            name="email"
                            control={control}
                            render={({ field }) => (
                                <Input 
                                    {...field}
                                    name="email"
                                    placeholder="Email"
                                    type="email"
                                />
                            )}
                        />
                    </div>

                    <div className={Style.control}>
                        <Controller
                            name="password"
                            control={control}
                            render={({ field }) => (
                                <Input 
                                    {...field}
                                    name="password"
                                    type="password"
                                    placeholder="Password"
                                />
                            )}
                        />
                    </div>

                    <Button type="submit" className={Style.submit} color="green">
                        Login
                    </Button>
                </Card>

                <small className={Style.legal}>
                    Copyright &copy;2021 - {(new Date()).getFullYear()}<br/>
                    Garden Route Innovation & Technology Hub, NPC.<br/>
                    All rights reserved. Terms and conditions apply.
                </small>
            </form>

            <div className={Style.background} />
        </>
    )
}


export default Page;