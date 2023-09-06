import clsx from "clsx";
import GeneralPage from "components/layout/GeneralPage";
import Link from "next/link";
import Style from "./internship.module.scss"
import { useEffect, useState } from "react";
import { provence } from "lib/provence";
import { countries } from "lib/countries";
import { useForm } from "react-hook-form";
import FirebaseService from "services/firebase/Firebase.service";
import { getDownloadURL } from "firebase/storage";
import Loader from "../../../components/feedback/Loader";
import { useRouter } from "next/navigation";


const firebaseService = new FirebaseService()

function InternshipApplication(){
    const router = useRouter()

    const [ cvURL, setCV ] = useState("")
    const [ idURL, setID ] = useState("")
    const [ certURL, setCertificate ] = useState("")

    const [ hasAttendCollege, setCollege ] = useState(false)
    const [ isNotFirstJob, setFirstJob ] = useState(false)
    const [ hasSideHustle, setSideHustle ] = useState(false)
    const [ isZA, setZA ] = useState(true)
    const [ isJobZA, setJobZA ] = useState(true)
    const [ isCurrentJob, setIsCurrentJob ] = useState(false)

    const [ isLoading, setIsLoading ] = useState(false)
    const [ isSuccessful, setIsSuccessful ] = useState(false)

    const { register, handleSubmit, watch, clearErrors, setError, formState: { errors } } = useForm();


    function checkFileType({ value, name }){
        let isValidFileType = false;
       
        try{
            if( value[0].name ){
                const fileExt = value[0].name.split(".")[1].toLowerCase()

                switch(fileExt){
                    case "pdf":
                    case "docx":
                    case "doc":
                    case "jpg":
                    case "jpeg":
                    case "png":
                    case "gif":
                        isValidFileType = true;
                        break;
                }
            }

        }catch(err){}
       

        if( !isValidFileType ){
            setError(name, { 
                type: "custom", 
                message: "Invalid file type" 
            }, { shouldFocus: true })

        }else{
            clearErrors(name)

            firebaseService.uploadFiles("internship_applications", value).then(response => {
                if( response?.state === "success" ){
                    getDownloadURL(firebaseService.storageRef).then(downloadURL => {

                        switch(name){
                            case "diploma":
                                setCertificate(downloadURL)
                                break;

                            case "CV":
                                setCV(downloadURL)
                                break;

                            case "ID":
                                setID(downloadURL)
                                break;
                        }
                    })
                }
            })
        }

    }


    useEffect(() => {
        const subscription = watch((value, { name, type }) => {
            switch(name){
                case "home_country":
                    setZA(value[name] === "South Africa");
                    break;

                case "job_country":
                    setJobZA(value[name] === "South Africa");
                    break;

                case "attending_university":
                    setCollege(value[name] === "true")
                    break;

                case "first_job":
                    setFirstJob(value[name] === "false")
                    break;

                case "current_job":
                    debugger
                    setIsCurrentJob(value[name] === true)
                    break;

                case "side_hustle":
                    setSideHustle(value[name] === "true")
                    break;

                case "CV":
                case "ID":
                case "diploma":
                    checkFileType({ value: value[name], name })
                    break;

                default: return;
            }
        });
        
        return () => subscription.unsubscribe();

    }, [watch]);




    function onSubmit(data){
        setIsLoading(true)

        const formObject = { ...data }

        // remove unsupported File fields for Firestore
        // delete formObject.CV;
        // delete formObject.ID;
        // delete formObject.diploma;

        firebaseService.setCollectionDocument({ 
            rootCollection: "internships",
            rootDocument: "applications",
            collection: "2023",
            key: `${data?.first_name} ${data?.last_name}`,
            data: {
                ...formObject,
                // cvURL,
                // idURL,
                // certURL
            }

        }).then(response => {
            console.log(response)
            setIsSuccessful(true)

            setTimeout(() => {
                router.push({
                    pathname: "/programs/internship/success",
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
            title="GRIT Internship Application"
            subTitle="Deadline: 31 August 2023"
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


                            <div className="col-md-6">
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
                                        id="website" 
                                        type="url"
                                        name="website"
                                        {...register("website")}
                                    />

                                    <label htmlFor="website">
                                        Website URL (Optional)
                                    </label>
                                </div>
                            </div>

                            <div className="col-md-6">
                                <div className="form-floating">
                                    <input 
                                        className="form-control" 
                                        id="github" 
                                        type="text"
                                        name="github"
                                        {...register("github")}
                                    />

                                    <label htmlFor="github">
                                        Github Handle (Optional)
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

                            {/*
                            <div className="col-md-12">
                                <p>
                                    How do you prefer for us to contact you?  Via...
                                </p>

                                <div className="form-check form-check-inline">
                                    <input 
                                        required 
                                        className="form-check-input" 
                                        id="contact_preference1" 
                                        type="radio"
                                        name="contact_preference"
                                        value="whatsapp"
                                        {...register("contact_preference")}
                                    />
                                    <label className="form-check-label" htmlFor="contact_preference1">
                                        WhatsApp
                                    </label>
                                </div>

                                <div className="form-check form-check-inline">
                                    <input 
                                        required 
                                        className="form-check-input" 
                                        id="contact_preference2" 
                                        type="radio"
                                        name="contact_preference"
                                        value="email"
                                        {...register("contact_preference")}
                                    />
                                    <label className="form-check-label" htmlFor="contact_preference2">
                                        Email
                                    </label>
                                </div>
                            </div>
                            */}

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
                            <legend className="mt-0">Education</legend>

                            <div className="col-12">
                                <p>
                                    Do you have a Senior Certificate or High School Diploma?*
                                </p>

                                <div className="form-check form-check-inline">
                                    <input 
                                        required 
                                        className="form-check-input" 
                                        id="graduated_highschool1" 
                                        type="radio"
                                        name="graduated_highschool"
                                        value={true}
                                        {...register("graduated_highschool")}
                                    />
                                    <label className="form-check-label" htmlFor="graduated_highschool1">
                                        Yes
                                    </label>
                                </div>

                                <div className="form-check form-check-inline">
                                    <input 
                                        required 
                                        className="form-check-input" 
                                        id="graduated_highschool2" 
                                        type="radio"
                                        name="graduated_highschool"
                                        value={false}
                                        {...register("graduated_highschool")}
                                    />
                                    <label className="form-check-label" htmlFor="graduated_highschool2">
                                        No
                                    </label>
                                </div>
                            </div>


                            <div className="col-12">
                                <p>
                                    Have you attended a University or TVET College?*
                                </p>

                                <div className="form-check form-check-inline">
                                    <input 
                                        required 
                                        className="form-check-input" 
                                        id="attending_university1" 
                                        type="radio"
                                        name="attending_university"
                                        value={true}
                                        {...register("attending_university")}
                                    />
                                    <label className="form-check-label" htmlFor="attending_university1">
                                        Yes
                                    </label>
                                </div>

                                <div className="form-check form-check-inline">
                                    <input 
                                        required 
                                        className="form-check-input" 
                                        id="attending_university2" 
                                        type="radio"
                                        name="attending_university"
                                        value={false}
                                        {...register("attending_university")}
                                    />
                                    <label className="form-check-label" htmlFor="attending_university2">
                                        No
                                    </label>
                                </div>
                            </div>

                            {hasAttendCollege && (
                                <>
                                    <div className="col-md-12">
                                        <div className="form-floating">
                                            <input 
                                                required 
                                                className="form-control" 
                                                id="school_name" 
                                                type="input"
                                                name="school_name"
                                                {...register("school_name")}
                                            />

                                            <label htmlFor="school_name">
                                                School Name*
                                            </label>
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <div className="form-floating">
                                            <select 
                                                required
                                                className="form-select" 
                                                id="school_diploma_status" 
                                                name="school_diploma_status"
                                                {...register("school_diploma_status")}
                                            >
                                                <option></option>
                                                <option>Higher Certificate</option>
                                                <option>(National) Diploma</option>
                                                <option>Bachelor's Degree</option>
                                                <option>Bachelor Honours Degree</option>
                                                <option>Master Degree</option>
                                                <option>Doctoral Degree (PhD)</option>
                                            </select>

                                            <label htmlFor="school_diploma">
                                                Diploma/Degree*
                                            </label>
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <div className="form-floating">
                                            <select 
                                                required
                                                className="form-select" 
                                                id="school_diploma_status" 
                                                name="school_diploma_status"
                                                {...register("school_diploma_status")}
                                            >
                                                <option></option>
                                                <option>Graduated</option>
                                                <option>Incomplete</option>
                                                <option>Now Attending</option>
                                            </select>

                                            <label htmlFor="school_diploma_status">
                                                Diploma/Degree Status*
                                            </label>
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <div className="form-floating">
                                            <input 
                                                required 
                                                className="form-control" 
                                                id="school_major" 
                                                type="input"
                                                name="school_major"
                                                {...register("school_major")}
                                            />

                                            <label htmlFor="school_major">
                                                Diploma/Degree Area of Study*
                                            </label>
                                        </div>
                                    </div>


                                    <div className="col-md-6">
                                        <div className="form-floating">
                                            <select 
                                                required
                                                className="form-select" 
                                                id="school_country" 
                                                name="school_country"
                                                {...register("school_country")}
                                                defaultValue="South Africa"
                                            >
                                                {countries.map(locale => <option key={locale.code}>{locale.name}</option> )}
                                            </select>

                                            <label htmlFor="school_country">
                                                Country*
                                            </label>
                                        </div>
                                    </div>

                                </>
                            )}
                        </fieldset>




                        <fieldset className="row g-4 shadow px-4 pt-4 pb-5 rounded mt-5">
                            <legend className="mt-0">Work Experience</legend>

                            <div className="col-12">
                                <p>
                                    Is this your first job you are applying for?*
                                </p>

                                <div className="form-check form-check-inline">
                                    <input 
                                        required 
                                        className="form-check-input" 
                                        id="first_job1" 
                                        type="radio"
                                        name="first_job"
                                        value={true}
                                        {...register("first_job")}
                                    />
                                    <label className="form-check-label" htmlFor="first_job1">
                                        Yes
                                    </label>
                                </div>

                                <div className="form-check form-check-inline">
                                    <input 
                                        required 
                                        className="form-check-input" 
                                        id="first_job2" 
                                        type="radio"
                                        name="first_job"
                                        value={false}
                                        {...register("first_job")}
                                    />
                                    <label className="form-check-label" htmlFor="first_job2">
                                        No
                                    </label>
                                </div>
                            </div>


                            
                            {isNotFirstJob && (
                                <>
                                    <div className="col-12">
                                        <p>
                                            Your most recent job
                                        </p>

                                        <div className="form-floating">
                                            <input 
                                                required 
                                                className="form-control" 
                                                id="employer_name" 
                                                type="input"
                                                name="employer_name"
                                                {...register("employer_name")}
                                            />

                                            <label htmlFor="employer_name">
                                                Employer name*
                                            </label>
                                        </div>
                                    </div>


                                    <div className="col-12">
                                        <div className="form-floating">
                                            <input 
                                                required 
                                                className="form-control" 
                                                id="job_title" 
                                                type="input"
                                                name="job_title"
                                                {...register("job_title")}
                                            />

                                            <label htmlFor="job_title">
                                                Job Title*
                                            </label>
                                        </div>
                                    </div>


                                    <div className="col-12">
                                        <div className="col-md-12 form-check">
                                            <input 
                                                type="checkbox" 
                                                name="current_job"
                                                {...register("current_job")} 
                                                id="current_job" 
                                                className="form-check-input"
                                            />
                                            
                                            <label htmlFor="current_job" className="form-check-label">
                                                This is your current job
                                            </label>
                                        </div>
                                    </div>


                                    <div className="col-md-6">
                                        <div className="form-floating">
                                            <input 
                                                required 
                                                className="form-control" 
                                                id="job_start_date" 
                                                type="date"
                                                name="job_start_date"
                                                max={new Date().toISOString().split("T")[0]}
                                                {...register("job_start_date")}
                                            />

                                            <label htmlFor="job_start_date">
                                                Start Date*
                                            </label>
                                        </div>
                                    </div>


                                    <div className="col-md-6">
                                        <div className="form-floating">
                                            <input 
                                                className="form-control" 
                                                id="job_end_date" 
                                                type="date"
                                                name="job_end_date"
                                                max={new Date().toISOString().split("T")[0]}
                                                {...register("job_end_date")}
                                                disabled={isCurrentJob}
                                            />

                                            <label htmlFor="job_end_date">
                                                End Date (Optional)
                                            </label>
                                        </div>
                                    </div>


                                    <div className="col-md-6">
                                        <div className="form-floating">
                                            <select 
                                                required
                                                className="form-select" 
                                                id="job_country" 
                                                name="job_country"
                                                {...register("job_country")}
                                                defaultValue="South Africa"
                                            >
                                                {countries.map(locale => <option key={locale.code}>{locale.name}</option> )}
                                            </select>

                                            <label htmlFor="job_country">
                                                Country*
                                            </label>
                                        </div>
                                    </div>


                                    <div className="col-md-6">
                                        <div className="form-floating">
                                            <input 
                                                required 
                                                className="form-control" 
                                                id="job_city" 
                                                type="input"
                                                name="job_city"
                                                {...register("job_city")}
                                            />

                                            <label htmlFor="job_city">
                                                City*
                                            </label>
                                        </div>
                                    </div>


                                    {isJobZA ? (
                                        <div className="col-md-6">
                                            <div className="form-floating">
                                                <select 
                                                    required
                                                    className="form-select" 
                                                    id="job_provence" 
                                                    name="job_provence"
                                                    {...register("job_provence")}
                                                >
                                                    <option></option>
                                                    {provence.map(locale => <option key={locale.code}>{locale.name}</option> )}
                                                </select>
                                                
                                                <label htmlFor="job_provence">
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
                                                    id="job_provence" 
                                                    type="input"
                                                    name="job_provence"
                                                    {...register("job_provence")}
                                                />

                                                <label htmlFor="job_provence">
                                                    State / Provence*
                                                </label>
                                            </div>
                                        </div>
                                    )}


                                    <div className="col-md-3">
                                        <div className="form-floating">
                                            <input 
                                                required 
                                                className="form-control" 
                                                id="job_postal" 
                                                type="tel"
                                                name="job_postal"
                                                {...register("job_postal")}
                                            />

                                            <label htmlFor="job_postal">
                                                Postal Code*
                                            </label>
                                        </div>
                                    </div>
                                </>
                            )}
                        </fieldset>



                        <fieldset className="row g-4 shadow px-4 pt-4 pb-5 rounded mt-5">
                            <legend className="mt-0">Your Side Hustle*</legend>

                            <div className="col-12">
                                <p>
                                    Do you have a Side Hustle (a personal entrepreneurial endeavor)?
                                </p>

                                <div className="form-check form-check-inline">
                                    <input 
                                        required 
                                        className="form-check-input" 
                                        id="side_hustle1" 
                                        type="radio"
                                        name="side_hustle"
                                        {...register("side_hustle")}
                                        value={true}
                                    />
                                    <label className="form-check-label" htmlFor="side_hustle1">
                                        Yes
                                    </label>
                                </div>

                                <div className="form-check form-check-inline">
                                    <input 
                                        required 
                                        className="form-check-input" 
                                        id="side_hustle2" 
                                        type="radio"
                                        name="side_hustle"
                                        {...register("side_hustle")}
                                        value={false}
                                    />
                                    <label className="form-check-label" htmlFor="side_hustle2">
                                        No
                                    </label>
                                </div>
                            </div>

                            {hasSideHustle && (
                                <>
                                    <div className="col-12">
                                        <p>
                                            Do you see it growing into something larger in the future?
                                        </p>

                                        <div className="form-check form-check-inline">
                                            <input 
                                                required 
                                                className="form-check-input" 
                                                id="side_hustle_growth1" 
                                                type="radio"
                                                name="side_hustle_growth"
                                                {...register("side_hustle_growth")}
                                                value={true}
                                            />
                                            <label className="form-check-label" htmlFor="side_hustle_growth1">
                                                Yes
                                            </label>
                                        </div>

                                        <div className="form-check form-check-inline">
                                            <input 
                                                required 
                                                className="form-check-input" 
                                                id="side_hustle_growth2" 
                                                type="radio"
                                                name="side_hustle_growth"
                                                {...register("side_hustle_growth")}
                                                value="maybe"
                                            />
                                            <label className="form-check-label" htmlFor="side_hustle_growth2">
                                                Maybe
                                            </label>
                                        </div>

                                        <div className="form-check form-check-inline">
                                            <input 
                                                required 
                                                className="form-check-input" 
                                                id="side_hustle_growth3" 
                                                type="radio"
                                                name="side_hustle_growth"
                                                {...register("side_hustle_growth")}
                                                value={false}
                                            />
                                            <label className="form-check-label" htmlFor="side_hustle_growth3">
                                                No
                                            </label>
                                        </div>
                                    </div>


                                    <div className="col-md-12">
                                        <div className="form-floating">
                                            <textarea 
                                                required 
                                                className={clsx(Style.textarea, "form-control")} 
                                                id="statement" 
                                                name="side_hustle_statement"
                                                {...register("side_hustle_statement")}
                                                style={{ minHeight: "100px"}} 
                                            />
                                            
                                            <label htmlFor="side_hustle_statement">
                                                Tell us more about what you do in your side hustle
                                            </label>
                                        </div>
                                    </div>
                                </>
                            )}
                            
                           

                        </fieldset>



                        <fieldset className="row g-4 shadow px-4 pt-4 pb-5 rounded mt-5">
                            <legend className="mt-0">Skills*</legend>
                            <p>What skills do you have? List all applicable technical, academic and personal skills (soft and hard skills) you have.</p>

                            <div className="col-md-12">
                                <div className="form-floating">
                                    <textarea 
                                        required className={clsx(Style.textarea, "form-control")} 
                                        id="skills" 
                                        name="skills"
                                        {...register("skills")}
                                        style={{ minHeight: "100px"}} 
                                    />
                                    
                                    <label htmlFor="skills">
                                        My skills include...
                                    </label>
                                </div>
                            </div>
                        </fieldset>



                        <fieldset className="row g-4 shadow px-4 pt-4 pb-5 rounded mt-5">
                            <legend className="mt-0">Statement Of Interest*</legend>
                            <p>Let us know who you are, why you want to apply to this internship program at GRIT Hub, what you want to get out of this opportunity, and why you think you will be a good fit.</p>

                            <div className="col-md-12">
                                <div className="form-floating">
                                    <textarea 
                                        required 
                                        className={clsx(Style.textarea, "form-control")} 
                                        id="statement" 
                                        {...register("statement")}
                                        style={{ minHeight: "200px"}} 
                                    />
                                    
                                    <label htmlFor="statement">
                                        Your chance to impress us
                                    </label>
                                </div>
                            </div>
                        </fieldset>

                    </div>

                    <div className="col-12 col-md-4">
                        <p>Applications must be completed by 11:59 PM CAT on the last day of the application period. Take time to prepare your application and enter your personal information accurately.</p> 
                        <small className="text-muted">* indicates required fields</small>

                        <hr />


                        <p>
                            <strong className="my-5">
                                Upload the following documents:
                            </strong>
                        </p>
                        
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
                            I understand that the information I provide will be used in accordance with GRIT Hub's applicant and candidate <Link href="/privacy" target="_blank">privacy policy</Link>. I consent to the processing of my information as described in that policy including that, in limited circumstances, GRIT Hub may share my contact information with trusted third parties, to assist in certain phases of the hiring process (such as conducting background checks).
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


export default InternshipApplication;