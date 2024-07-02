import clsx from "clsx";
import GeneralPage from "components/layout/GeneralPage";
import Link from "next/link";
import Style from "./competition.module.scss"
import { useEffect, useState } from "react";
import { provence } from "lib/provence";
import { countries } from "lib/countries";
import { useForm } from "react-hook-form";
import FirebaseService from "ui/services/firebase/Firebase.service"
import Loader from "components/feedback/Loader";
import { useRouter } from "next/navigation";


const firebaseService = new FirebaseService()

function CompetitionApplication(){
    const router = useRouter()

    const [ isNMUGeorge, setNMUGeorge ] = useState(false)
    const [ isZA, setZA ] = useState(true)
    const [ isLoading, setIsLoading ] = useState(false)
    const [ isSuccessful, setIsSuccessful ] = useState(false)
    const [ haveCompanyName, setHaveCompanyName ] = useState(false)

    const { register, handleSubmit, watch, clearErrors, setError, formState: { errors } } = useForm();

    useEffect(() => {
        console.log(errors)
    }, [errors])


    useEffect(() => {
        const subscription = watch((value, { name, type }) => {
            console.log(value, name, type)
            switch(name){
                case "home_country":
                    setZA(value[name] === "South Africa");
                    break;

                case "nmu_george_student":
                    setNMUGeorge(value[name] === "true")
                    break;

                case "have_company_name":
                    setHaveCompanyName(value[name] === "true")
                    break;

                default: return;
            }
        });
        
        return () => subscription.unsubscribe();

    }, [watch]);



    function onSubmit(data){
        setIsLoading(true)

        const formObject = { ...data }

        firebaseService.setCollectionDocument({ 
            rootCollection: "competition",
            rootDocument: "i_have_an_idea",
            documentCollection: "2024",
            key: `${data?.first_name} ${data?.last_name}`,
            data: {
                ...formObject,
            }

        }).then(response => {
            console.log(response)
            setIsSuccessful(true)

            setTimeout(() => {
                router.push({
                    pathname: "/incubation/competition/success",
                    query: {
                        first_name: data.first_name,
                        email: data.email
                    }
                })

                setIsLoading(false)
            }, 3000)
        })
    }



    return(
        <GeneralPage 
            title="Competition Application"
            subTitle="Deadline: 31 August 2024"
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
                                        {...register("first_name", { required: true })}
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


                            <div className="col-md-6">
                                <div className="form-floating">
                                    <select 
                                        required
                                        className="form-select" 
                                        id="gender" 
                                        name="gender"
                                        {...register("gender")}
                                    >
                                        <option></option>
                                        <option>Female</option>
                                        <option>Male</option>
                                        <option>Rather not say</option>
                                    </select>

                                    <label htmlFor="gender">
                                        Gender
                                    </label>
                                </div>
                            </div>

                            <div className="col-md-6">
                                <div className="form-floating">
                                    <input 
                                        required 
                                        className="form-control" 
                                        id="birthday" 
                                        type="date"
                                        name="birthday"
                                        max={new Date().toISOString().split("T")[0]}
                                        {...register("birthday")}
                                    />

                                    <label htmlFor="birthday">
                                        Birthday
                                    </label>
                                </div>
                            </div>

                           

                            <div className="col-md-6">
                                <div className="form-floating">
                                    <input 
                                        className="form-control" 
                                        id="id_number" 
                                        type="text"
                                        name="id_number"
                                        required
                                        {...register("id_number")}
                                    />

                                    <label htmlFor="id_number">
                                        SA ID or Passport Number
                                    </label>
                                </div>
                            </div>
                        </fieldset>





                        <fieldset className="row g-4 shadow px-4 pt-4 pb-5 rounded mt-5">
                            <legend className="mt-0">Contact Details</legend>

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
                                        id="home_address" 
                                        type="input"
                                        name="home_address"
                                        {...register("home_address")}
                                    />

                                    <label htmlFor="home_address">
                                        Mailing Address*
                                    </label>
                                </div>
                            </div>

                            <div className="col-md-6">
                                <div className="form-floating">
                                    <select 
                                        required
                                        className="form-select" 
                                        id="home_country" 
                                        name="home_country"
                                        {...register("home_country")}
                                        defaultValue="South Africa"
                                    >
                                        {countries.map(locale => <option key={locale.code}>{locale.name}</option> )}
                                    </select>

                                    <label htmlFor="home_country">
                                        Country*
                                    </label>
                                </div>
                            </div>


                            <div className="col-md-6">
                                <div className="form-floating">
                                    <input 
                                        required 
                                        className="form-control" 
                                        id="home_city" 
                                        type="input"
                                        name="home_city"
                                        {...register("home_city")}
                                    />

                                    <label htmlFor="home_city">
                                        City*
                                    </label>
                                </div>
                            </div>


                            {isZA ? (
                                <div className="col-md-6">
                                    <div className="form-floating">
                                        <select 
                                            required
                                            className="form-select" 
                                            id="home_provence" 
                                            name="home_provence"
                                            {...register("home_provence")}
                                        >
                                            <option></option>
                                            {provence.map(locale => <option key={locale.code}>{locale.name}</option> )}
                                        </select>
                                        
                                        <label htmlFor="home_provence">
                                            Province*
                                        </label>
                                    </div>
                                </div>

                            ):(

                                <div className="col-md-6">
                                    <div className="form-floating">
                                        <input 
                                            required 
                                            className="form-control" 
                                            id="home_provence" 
                                            type="input"
                                            name="home_provence"
                                            {...register("home_provence")}
                                        />

                                        <label htmlFor="home_provence">
                                            State / Provence*
                                        </label>
                                    </div>
                                </div>
                            )}
                            


                            <div className="col-md-3">
                                <div className="form-floating">
                                    <input 
                                        className="form-control" 
                                        id="home_suburb" 
                                        type="input"
                                        name="home_suburb"
                                        {...register("home_suburb")}
                                    />

                                    <label htmlFor="home_suburb">
                                        Suburb (Optional)
                                    </label>
                                </div>
                            </div>


                            <div className="col-md-3">
                                <div className="form-floating">
                                    <input 
                                        required 
                                        className="form-control" 
                                        id="home_postal" 
                                        type="tel"
                                        name="home_postal"
                                        {...register("home_postal")}
                                    />

                                    <label htmlFor="home_postal">
                                        Postal Code*
                                    </label>
                                </div>
                            </div>
                        </fieldset>





                        <fieldset className="row g-4 shadow px-4 pt-4 pb-5 rounded mt-5">
                            <legend className="mt-0">Idea Background</legend>

                            <div className="col-12">
                                <p>
                                    Are you currently an active and enrolled student at Nelson Mandela University: George Campus?*
                                </p>

                                <div className="form-check form-check-inline">
                                    <input 
                                        required 
                                        className="form-check-input" 
                                        id="nmu_george_student_yes" 
                                        type="radio"
                                        name="nmu_george_student"
                                        value={true}
                                        {...register("nmu_george_student")}
                                    />
                                    <label className="form-check-label" htmlFor="nmu_george_student_yes">
                                        Yes
                                    </label>
                                </div>

                                <div className="form-check form-check-inline">
                                    <input 
                                        required 
                                        className="form-check-input" 
                                        id="nmu_george_student_no" 
                                        type="radio"
                                        name="nmu_george_student"
                                        value={false}
                                        {...register("nmu_george_student")}
                                    />
                                    <label className="form-check-label" htmlFor="nmu_george_student_no">
                                        No
                                    </label>
                                </div>
                            </div>

                
                            {isNMUGeorge && (
                                <>
                                    <div className="col-md-6">
                                        <div className="form-floating">
                                            <input 
                                                className="form-control" 
                                                id="nmu_student_id" 
                                                type="text"
                                                required
                                                name="nmu_student_id"
                                                {...register("nmu_student_id")}
                                                pattern="s\d{9}"
                                            />

                                            <label htmlFor="nmu_student_id">
                                                Student ID
                                            </label>
                                        </div>
                                    </div>


                                    <div className="col-md-6">
                                        <div className="form-floating">
                                            <input 
                                                className="form-control" 
                                                required
                                                id="major" 
                                                type="text"
                                                name="major"
                                                {...register("major")}
                                            />

                                            <label htmlFor="major">
                                                Undergrad Program / Major
                                            </label>
                                        </div>
                                    </div>


                                    <div className="col-12">
                                        <div className="form-floating">
                                            <select 
                                                required
                                                className="form-select" 
                                                id="track" 
                                                name="track"
                                                {...register("track")}
                                            >
                                                <option></option>
                                                <option>Social & Climate/Environmental Impact</option>
                                                <option>Consumer Products & Services</option>
                                            </select>

                                            <label htmlFor="track">
                                                Competition Track*
                                            </label>
                                        </div>
                                    </div>


                                    <h5>Founder's Info</h5>

                                    <div className="col-md-6">
                                        <div className="form-floating">
                                            <input 
                                                className="form-control" 
                                                required
                                                id="founder" 
                                                type="text"
                                                name="founder"
                                                {...register("founder")}
                                            />

                                            <label htmlFor="founder">
                                                Founder Name*
                                            </label>
                                        </div>
                                    </div>


                                    <div className="col-md-6">
                                        <div className="form-floating">
                                            <input 
                                                required 
                                                className="form-control" 
                                                id="founder_email" 
                                                type="input"
                                                name="founder_email"
                                                {...register("founder_email")}
                                            />

                                            <label htmlFor="founder_email">
                                                Founder Email Address*
                                            </label>
                                        </div>
                                    </div>


                                    <div className="col-md-6">
                                        <div className="form-floating">
                                            <input 
                                                className="form-control" 
                                                id="co_founder" 
                                                type="text"
                                                name="co_founder"
                                                {...register("co_founder")}
                                            />

                                            <label htmlFor="co_founder">
                                                Co-Founder Name (if applicable)
                                            </label>
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <div className="form-floating">
                                            <input 
                                                className="form-control" 
                                                id="co_founder_email" 
                                                type="input"
                                                name="co_founder_email"
                                                {...register("co_founder_email")}
                                            />

                                            <label htmlFor="co_founder_email">
                                                Co-Founder Email Address (if applicable)
                                            </label>
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <div className="form-floating">
                                            <input 
                                                className="form-control" 
                                                id="co_founder_2" 
                                                type="text"
                                                name="co_founder_2"
                                                {...register("co_founder_2")}
                                            />

                                            <label htmlFor="co_founder_2">
                                                Co-Founder Name #2 (if applicable)
                                            </label>
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <div className="form-floating">
                                            <input 
                                                className="form-control" 
                                                id="co_founder_email_2" 
                                                type="input"
                                                name="co_founder_email_2"
                                                {...register("co_founder_email_2")}
                                            />

                                            <label htmlFor="co_founder_email_2">
                                                Co-Founder #2 Email Address (if applicable)
                                            </label>
                                        </div>
                                    </div>

                                  


                                    <div className="col-12">
                                        <p>
                                            Have you come up with a name for your idea? No sweat if you're not there yet.
                                        </p>

                                        <div className="form-check form-check-inline">
                                            <input 
                                                required 
                                                className="form-check-input" 
                                                id="have_company_name_yes" 
                                                type="radio"
                                                name="have_company_name"
                                                value={true}
                                                {...register("have_company_name")}
                                            />
                                            <label className="form-check-label" htmlFor="have_company_name_yes">
                                                Yes
                                            </label>
                                        </div>

                                        <div className="form-check form-check-inline">
                                            <input 
                                                required 
                                                className="form-check-input" 
                                                id="have_company_name_no" 
                                                type="radio"
                                                name="have_company_name"
                                                value={false}
                                                {...register("have_company_name")}
                                            />
                                            <label className="form-check-label" htmlFor="have_company_name_no">
                                                No
                                            </label>
                                        </div>
                                    </div>

                                    {haveCompanyName && (
                                        <div className="col-12">
                                            <div className="form-floating">
                                                <input 
                                                    className="form-control" 
                                                    id="company_name" 
                                                    type="text"
                                                    name="company_name"
                                                    {...register("company_name")}
                                                />

                                                <label htmlFor="company_name">
                                                    If so, what is it's proposed name?
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                    
                                </>
                            )}
                        </fieldset>


                    {isNMUGeorge && (
                        <fieldset className="row g-4 shadow px-4 pt-4 pb-5 rounded mt-5">
                            <legend className="mt-0 mb-0">The Application Video</legend>
                            <p>You may pitch in which ever language you feel most comfortable with, but please ensure that your video is clear, concise, and engaging.  If you need direction, read our <a href="#tips">application video tips</a>. You can make this <a href="https://support.google.com/youtube/answer/157177?hl=en&co=GENIE.Platform%3DDesktop" target="_blank" rel="noreferrer">a private or unlisted YouTube video</a>, but give us a sharable working link.</p>


                            <div className="col-12">
                                <div className="form-floating">
                                    <input 
                                        className="form-control" 
                                        id="application_video" 
                                        required
                                        type="url"
                                        name="application_video"
                                        {...register("application_video")}
                                    />

                                    <label htmlFor="application_video">
                                        90 Second YouTube Video URL*
                                    </label>
                                </div>
                            </div>

                            <div className="alert alert-info">
                                <h4 className="mb-4">Video Instructions</h4>

                                <ul className="ps-3">
                                    <li className="mb-4">YES! You can say your pitch in your mother-tongue.</li>
                                    <li className="mb-4"><strong>Upload your video to YouTube.</strong> Make sure you provide us the full URL to your video (including the https://youtu.be part).  You can make this <a href="https://support.google.com/youtube/answer/157177?hl=en&co=GENIE.Platform%3DDesktop" target="_blank" rel="noreferrer">a private or unlisted YouTube video</a>, but give us a sharable working link.</li>
                                    <li className="mb-4"><strong>This is not the place to submit a demo or promotional video.</strong> For this video, we want to hear how the founders communicate.</li>
                                    <li className="mb-4"><strong>Your video should be a maximum of 90 seconds long and should contain nothing except the founders talking.</strong> Double check the audio levels so we can hear you properly. No music. No slides. No graphics or special effects.</li>
                                    <li><strong>If you have more than one founder, have all of your founders in the video.</strong> If you can't be in the same room at the same time, screen record a video call instead.</li>
                                </ul>
                            </div>

                            
                        </fieldset>
                    )}


                        <fieldset className="row g-4 shadow px-4 pt-4 pb-5 rounded mt-5">
                            <legend className="mt-0">Any additional information? (Optional)</legend>

                            <div className="col-md-12">
                                <div className="form-floating">
                                    <textarea 
                                        className={clsx(Style.textarea, "form-control")} 
                                        id="statement" 
                                        {...register("statement")}
                                        style={{ minHeight: "200px"}} 
                                    />
                                    
                                    <label htmlFor="statement">
                                        Anything else you'd like to share with us?
                                    </label>
                                </div>
                            </div>
                        </fieldset>

                    </div>

                    <div className="col-12 col-md-4">
                        <p>Applications must be completed by 11:59 PM CAT on the last day of the application period. Take time to prepare your application and enter your personal information accurately.</p> 
                        <small className="text-muted">* indicates required fields</small>

                        <hr className="my-5" />

                        <div className="alert alert-secondary" id="tips">
                            <h4 className="mb-3">
                                Tips: What to say in your video
                            </h4>

                            <ol className="ps-4">
                                <li className="mb-4"><strong>Introduction:</strong> Start by introducing yourself and any team members participating in the competition. Provide a brief overview of your background and why you're passionate about entrepreneurship and innovation.</li>

                                <li className="mb-4"><strong>Team:</strong> Introduce the Founder any any Co-Founders and highlight their relevant skills and experience. Explain why your team is well-equipped to execute the idea and bring it to market successfully.</li>

                                <li className="mb-4"><strong>Problem Statement:</strong> Clearly articulate the problem or opportunity your idea addresses. Explain why this problem is significant and why it needs to be solved.</li>

                                <li className="mb-4"><strong>Solution:</strong> Describe your proposed solution or idea in detail. Explain how it addresses the problem identified and why it is unique or innovative compared to existing solutions.</li>

                                <li className="mb-4"><strong>Market Opportunity:</strong> Discuss the market opportunity for your idea. Who are your target customers? What is the size of the market, and how will your solution meet their needs?</li>

                                <li><strong>Vision:</strong> Share your long-term vision for the idea and how you envision it making an impact. What are your goals for the future, and how do you plan to scale the idea?</li>
                            </ol>
                        </div>

                        {/* <p>
                            <strong className="my-5">
                                Upload the following documents:
                            </strong>
                        </p> */}
                        
                        {/* <p className="mb-5">
                            Your Curriculum Vitae (CV)* {errors.CV && <small className="text-danger">- {errors.CV.message}</small>}<br/>
                            <input 
                                className={clsx("form-control", errors.CV && "is-invalid")}
                                type="file" 
                                name="CV" 
                                {...register("CV", { required: true })}
                            />
                            <small className="form-text">Accepted formats: doc, docx, pdf, jpg, png, gif</small>
                            
                        </p> */}
                        
                        {/* <p className="mb-5">
                            Your SA ID or Passport* {errors.ID && <small className="text-danger">- {errors.ID.message}</small>}<br/>
                            <input 
                                 className={clsx("form-control", errors.ID && "is-invalid")}
                                type="file" 
                                name="ID" 
                                {...register("ID", { required: true })}
                            />
                            <small className="form-text">Accepted formats: doc, docx, pdf, jpg, png, gif</small>
                        </p> */}


                        {/* <p className="mb-5">
                            Your Senior Certificate or High School Diploma* {errors.diploma && <small className="text-danger">- {errors.diploma.message}</small>}<br/>
                            <input 
                                 className={clsx("form-control", errors.diploma && "is-invalid")}
                                type="file" 
                                name="diploma" 
                                {...register("diploma", { required: true })}
                            />
                            <small className="form-text">Accepted formats: doc, docx, pdf, jpg, png, gif</small>
                        </p> */}
                       
                    </div>
                </div>

                <div className="row mt-5 pb-4">
                    <div className="col-md-12 form-check">
                        <input 
                            required 
                            type="checkbox" 
                            name="consent" 
                            {...register("consent")}
                            id="consent" 
                            className="form-check-input"
                        />

                        <label htmlFor="consent" className="form-check-label">
                            I understand that the information I provide will be used in accordance with GRIT Hub's applicant and <Link href="/privacy" target="_blank">privacy policy</Link>. I consent to the processing of my information as described in that policy including that, in limited circumstances, GRIT Hub may share my contact information with trusted third parties, to assist in certain phases of the application process (such as conducting background checks).
                        </label>
                    </div>
                </div>

                <hr />

                <div className="col-12 d-flex justify-content-between">
                    <Link href="/programs/internship" className="btn btn-lg btn-outline-secondary">
                        Cancel
                    </Link>
                    
                    <button type="submit" className={clsx(Style.submit, "btn btn-lg btn-primary")}>
                        {isLoading ? <Loader {...{ isLoading, isSuccessful }} /> : "Submit Application" }
                    </button>
                </div>
            </form>
        </GeneralPage>
    )
}


export default CompetitionApplication;