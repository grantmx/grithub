import clsx from "clsx";
import Style from "./Bookings.module.scss"
import { useRouter } from "next/router";
import { useContext, useEffect } from "react";
import { StepperContext } from "../navigation/Stepper/context/StepperContext";
import formatPrice from "../../lib/utils/formatPrice";



function CustomerDetails(){
    const router = useRouter()
    const [ globalBook, dispatch ] = useContext(StepperContext)

    useEffect(() => {
        if( globalBook.current !== 2 ){
            router.push({ href: "/cowork/book", query: { step: 1 } })
        }

    }, [ globalBook ])


    function submitForm(e){
        e.preventDefault()

        dispatch({
            type: "nextStep",
            data: 3
        })
    }


    function goBack(){
        dispatch({
            type: "nextStep",
            data: 1
        })

        router.back()
    }


    function handelControl(e){
        const name = e.target.name;
        const value = e.target.value;

        dispatch({
            type: "setData",
            data: {
                ...globalBook?.data,
                [name]: value,
            }
        })
    }



    return(
        <div className={clsx(Style.form, "col-8")}>
            <form className="form-floating" onSubmit={submitForm}>
                <h2>
                    Hot Desk (Open Space) for 1 person on Fri 21 July 2023 (9:00) - Full Day 
                </h2>
                <p>We need your details for the booking confirmation and reminder. If arranging on behalf of somebody else please enter their details so they receive the relevant communications. </p>

                <fieldset className="row g-4">
                    <div className="col-md-6">
                        <div className="form-floating">
                            <input 
                                required 
                                className="form-control" 
                                id="first_name" 
                                type="input"
                                name="first_name"
                                onChange={handelControl}
                                value={globalBook?.data?.first_name ?? ""}
                            />

                            <label htmlFor="first_name">
                                First Name
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
                                onChange={handelControl}
                                value={globalBook?.data?.last_name ?? ""}
                            />

                            <label htmlFor="last_name">
                                Last Name
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
                                onChange={handelControl}
                                value={globalBook?.data?.email ?? ""}
                            />

                            <label htmlFor="email">
                                Email Address
                            </label>
                        </div>
                    </div>



                    <div className="col-md-12">
                        <div className="form-floating">
                            <input 
                                required 
                                className="form-control" 
                                id="phone" 
                                type="input"
                                name="phone"
                                onChange={handelControl}
                                value={globalBook?.data?.phone ?? ""}
                            />

                            <label htmlFor="phone">
                                Phone Number
                            </label>
                        </div>
                    </div>
                </fieldset>

                <hr className="mt-5 mb-3" />


                <fieldset className="row">
                    <div className="col-md-2">
                        <button type="button" className="btn btn-lg btn-outline-secondary" onClick={goBack}>
                            Back
                        </button>
                    </div>

                    <div className="col-md-10 d-flex justify-content-end align-items-center">
                        <span className="fs-5 me-4">
                            Booking total: {formatPrice(globalBook?.data?.cost)}
                        </span>

                        <button 
                            disabled={
                                !globalBook?.data?.first_name &&
                                !globalBook?.data?.last_name &&
                                !globalBook?.data?.email &&
                                !globalBook?.data?.phone
                            }
                            type="submit" 
                            className="btn btn-lg btn-primary"
                        >
                            Book & Confirm Payment Details
                        </button>
                    </div>
                </fieldset>
            </form>
        </div>
    )
}


export default CustomerDetails;