import GeneralPage from "components/layout/GeneralPage";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { IconLock } from "../../../components/icons/IconLock";
import image from "public/assets/coding-master-class-banner.jpg"
import openGraphImg from "public/assets/coding-master-class-card.jpg"
import { useState } from "react";
import Loader from "components/feedback/Loader";
import useYocoUrl from "../../../services/yoco/useYocoUrl";
import axios from "axios";



function ProgramRegister() {
    const { register, handleSubmit, watch, clearErrors, setError, formState: { errors } } = useForm();
    const [ isLoading, setIsLoading ] = useState(false)
    const [ isSuccessful, setIsSuccessful ] = useState(false)

    const yocoUrl = useYocoUrl()


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
                setIsLoading(false)
                setIsSuccessful(true)

                sendEmail(data)

                window.location.href = yocoUrl.data
            }
        })
    }




    return(
        <GeneralPage 
            title="Coding Masterclass" 
            subTitle="From beginner to a professional web developer. Learn from the experts." 
            image={image}
            className="text-white"
            openGraph={{
                url: "https://grithub.org.za/programs/register/masterclass",
                title: "Coding Masterclass",
                description: "From beginner to a professional web developer. Learn from the experts.",
                images: [
                    {
                        url: "https://grithub.org.za" + openGraphImg.src,
                        width: 800,
                        height: 800,
                        alt: "Coding Masterclass",
                        type: 'image/jpeg',
                    },
                ],
                siteName: 'Garden Route Innovation & Technology Hub',
            }}
        >
            <form className="container-xxl d-flex p-md-5 p-4 flex-column mb-5" onSubmit={handleSubmit(onSubmit)}>
                <div className="col-12 d-flex flex-column flex-md-row mt-3">
                    <div className="col-12 col-md-8 pe-md-5 mb-5">
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
                                <button style={{ width: "250px", height: "48px" }} type="submit" className="btn rounded-pill btn-primary btn-lg px-5 d-flex align-items-center">
                                    {isLoading ? <Loader {...{ isLoading, isSuccessful }} /> : (
                                        <>
                                            <IconLock fill="#fff" width="24" height="24" className="me-2" />
                                            Register
                                        </>
                                    )}
                                </button>
                            </div>
                        
                        </fieldset>
                    </div>


                    <div className="col-12 col-md-4">
                        <Image src="/assets/html-js-css.png" width={400} height={200} alt="html" style={{ objectFit: "contain" }} />

                        <p>
                            This is a 12 week Master Class that will take you from a beginner to a professional web developer.  You will learn enterprise level HTML, CSS, and JavaScript used in web app development, web software platforms and eCommerce.  This class is for those who want to learn to code and build websites and web applications professionally.
                        </p>

                        <p>
                            <strong>
                            July 27th - October 26th<br />
                            Every Saturday: 11 AM to 3 PM<br />
                            Garden Route Innovation & Technology Hub, George<br />
                            <br />
                            Cost: R3,499
                            <br />
                            </strong>
                        </p>

                        <hr/>

                        <h4>What will you learn?</h4>

                        <ul className="mb-4">
                            <li>Enterprise Level Software for Web Development</li>
                            <li>HTML5, CSS3, SASS, Web Accessibility, and Design</li>
                            <li>Responsive Web Development & Design</li>
                            <li>History of JavaScript, ECMAScript, Object Oriented Scripting</li>
                            <li>The bad parts of JavaScript</li>
                            <li>Values, Types, and Operators</li>
                            <li>Programming Structure, Expressions, loops, syntax</li>
                            <li>Data Structures, Arrays, Objects, JSON</li>
                            <li>Getting and Sending data to the Server</li>
                            <li>Build a full functioning Website on a web-hosted setup using industry tools.</li>
                            <li>Obtain a GRIT Hub certification upon successful completion of this course.</li>
                        </ul>

                        <p>
                            <strong>CLASS REQUIREMENTS:</strong> Students will need a laptop computer (not a Chromebook). Don't have a computer? Don't let that stop you from joining us! Email workforce@grithub.org.za to inquire about options.
                        </p>

                        
                    </div>
                </div>
            </form>
        </GeneralPage>
    )
}



export default ProgramRegister;