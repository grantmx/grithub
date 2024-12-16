"use client"

import { useState } from "react";
import useYocoUrl from "services/yoco/useYocoUrl";
import { useForm } from "react-hook-form";
import axios from "axios";
import { IconLock } from "components/icons/IconLock"
import Loader from "components/feedback/Loader";


function HTMLBasicsForm(){
    const { register, handleSubmit, watch, clearErrors, setError, formState: { errors } } = useForm();
    const [ isLoading, setIsLoading ] = useState(false)
    const [ isSuccessful, setIsSuccessful ] = useState(false)

    const yocoUrl = useYocoUrl({ amount: 2499 })


    function sendEmail({ email, first_name }){
        axios.post("/api/email/internship", {
            subject: `Your in, ${first_name}! 🎉`,
            to: email,
            heading: `Hey, ${first_name}! 👋`,
            message: `
                <p>Your registration for the GRIT Hub class was successful.  Thanks!</p>
                <p>Once we finalized your payment you will receive a course syllabus and further details regarding class materials, dates and times. If you have any questions, please don't hesitate to ask.</p>
                <p>All the best!</p>
            `
        })  
    }




    function onSubmit(data){
        setIsLoading(true)

        axios({
            method: "POST",
            url: "/api/forms/submitRegistration",
            headers: {
                "Content-Type": "application/json",
            },
            data

        }).then((res) => {
            if(res.data === "done"){
                sendEmail(data)

                setTimeout(() => {
                    setIsLoading(false)
                    setIsSuccessful(true)

                    window.location.href = yocoUrl.data
                }, 2000)
            }
        })
    }




    return(
        <form className="col-12 col-md-8 pe-md-5 mb-5" onSubmit={handleSubmit(onSubmit)}>
            <fieldset className="row g-4 shadow px-4 pt-4 pb-5 rounded">
                <legend className="mt-0">Personal Information</legend>
                
                <div className="col-md-6">
                    <div className="form-floating">
                        <input 
                            required 
                            className="form-control" 
                            id="first_name" 
                            type="input"
                            name="first_name"
                            {...register("first_name")}
                        />

                        <label htmlFor="first_name">
                            First Name*
                        </label>
                    </div>
                </div>


                <div className="col-md-6">
                    <div className="form-floating">
                        <input 
                            required 
                            className="form-control" 
                            id="last_name" 
                            type="input"
                            name="last_name"
                            {...register("last_name")}
                        />

                        <label htmlFor="last_name">
                            Last Name*
                        </label>
                    </div>
                </div>


                <div className="col-md-12">
                    <div className="form-floating">
                        <input 
                            className="form-control" 
                            id="preferred_name" 
                            type="input"
                            name="preferred_name"
                            {...register("preferred_name")}
                        />

                        <label htmlFor="preferred_name">
                            Preferred Name (Optional)
                        </label>
                    </div>
                </div>

                <div className="col-md-12">
                    <div className="form-floating">
                        <input 
                            required 
                            className="form-control" 
                            id="email" 
                            type="input"
                            name="email"
                            {...register("email")}
                        />

                        <label htmlFor="email">
                            Email Address*
                        </label>
                    </div>
                </div>

                <div className="col-md-12">
                    <div className="form-floating">
                        <input 
                            required 
                            className="form-control" 
                            id="phone" 
                            type="tel"
                            name="phone"
                            {...register("phone")}
                        />

                        <label htmlFor="phone">
                            Phone / WhatsApp Number*
                        </label>
                    </div>
                </div>


                <div className="col-md-12">
                    <div className="form-floating">
                        <input 
                            required 
                            className="form-control" 
                            id="identification" 
                            type="tel"
                            name="identification"
                            {...register("identification")}
                        />

                        <label htmlFor="identification">
                            SA ID / Passport Number*
                        </label>
                    </div>
                </div>
            
                <label>
                    <input type="checkbox" name="agree_to_terms" {...register("agree_to_terms")} />
                    &nbsp; I agree
                </label>

                <p className="mb-1">Garden Route Innovation and Technology Hub is committed to protecting and respecting your privacy, and we'll only use your personal information to administer your account and to provide the products and services you requested from us. From time to time, we would like to contact you about our products and services, as well as other content that may be of interest to you. If you consent to us contacting you for this purpose, please tick to say how you would like us to contact you.</p>

                <small>You can unsubscribe from these communications at any time. For more information on how to unsubscribe, our privacy practices, and how we are committed to protecting and respecting your privacy, please review our Privacy Policy.
                By clicking submit below, you consent to allow Garden Route Innovation and Technology Hub to store and process the personal information submitted above to provide you the content requested.</small>    
            

                <div className="col-12 d-flex justify-content-between">
                    <button style={{ width: "250px", height: "48px" }} type="submit" className="btn rounded-pill btn-primary btn-lg px-3 d-flex align-items-center justify-content-center">
                        {isLoading ? <Loader {...{ isLoading, isSuccessful }} /> : (
                            <strong>
                                <IconLock fill="#fff" width="20" height="20" className="me-2" />
                                Register Now
                            </strong>
                        )}
                    </button>
                </div>
            
            </fieldset>
        </form>
    )
}

export default HTMLBasicsForm;