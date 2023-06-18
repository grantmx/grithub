"use client"

import { useForm } from "react-hook-form";



function Form({ children, className }){
    const { handleSubmit } = useForm({
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
        <form className={className} onSubmit={handleSubmit(onSubmit)}>
            {children}
        </form>
    )
}


export default Form;