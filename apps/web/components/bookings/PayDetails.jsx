"use client"

import axios from "axios";
import clsx from "clsx";
import Style from "./Bookings.module.scss"
import formatPrice from "../../lib/utils/formatPrice";
import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StepperContext } from "../navigation/Stepper/context/StepperContext";
import { bookingSettings } from "../../lib/constants";


function PayDetails(){
    const router = useRouter()
    const [ globalBook, dispatch ] = useContext(StepperContext)
    const [ submitting, setSubmitting ] = useState(false)
    const [ error, setError ] = useState("")

    useEffect(() => {
        if( globalBook.current !== 3 ){
            router.push("/cowork/book?step=2")
        }

    }, [ globalBook ])


    function goBack(){
        dispatch({
            type: "nextStep",
            data: 2
        })

        router.push("/cowork/book?step=2")
    }


    function submitForm(e){
        e.preventDefault()
        setSubmitting(true)
        setError("")

        axios.post("/api/paystack/createBookingLink", globalBook.data)
            .then(res => {
                window.location.href = res.data.redirectUrl
            })
            .catch(() => {
                setSubmitting(false)
                setError("We couldn't start your payment. Please try again.")
            })
    }


    return(
        <div className={clsx(Style.form, "col-md-8 col-12")}>
            <form className="form-floating" onSubmit={submitForm}>
                <h3 className="fs-2 lh-1 mb-4 fw-bold">
                    Review Booking
                </h3>

                <div className="d-flex flex-column flex-md-row">
                    <ul className="list-unstyled col-md-6 col-12">
                        <li><strong>Name</strong>: {globalBook?.data?.first_name} {globalBook?.data?.last_name}</li>
                        <li><strong>Email</strong>: {globalBook?.data?.email}</li>
                        <li><strong>Phone</strong>: {globalBook?.data?.phone}</li>
                    </ul>

                    <ul className="list-unstyled col-md-6 col-12">
                        <li><strong>Workspace</strong>: {globalBook?.data?.workspace}{globalBook?.data?.stoep_addon && " + Stoep (Outdoors)"}</li>
                        <li><strong>Guests</strong>: {globalBook?.data?.guests}</li>
                        <li><strong>Arrival</strong>: {globalBook?.data?.date} @ {globalBook?.data?.arrival}</li>
                        {(globalBook?.data?.additional_days ?? []).map((day, index) => (
                            <li key={index}><strong>Additional Day</strong>: {day.date} @ {day.arrival}</li>
                        ))}
                        <li><strong>Duration</strong>: {globalBook?.data?.duration}{globalBook?.data?.duration === "hourly" && ` (${globalBook?.data?.hours} hour${globalBook?.data?.hours > 1 ? "s" : ""})`}</li>
                        {globalBook?.data?.catering_requested && (
                            <li><strong>Catering</strong>: Requested{globalBook?.data?.catering_budget && ` (budget: ${formatPrice(globalBook?.data?.catering_budget)})`}</li>
                        )}
                        {Object.entries(globalBook?.data?.amenities ?? {})
                            .filter(([ , checked ]) => checked)
                            .map(([ key ]) => (
                                <li key={key}><strong>Add-on</strong>: {bookingSettings.amenities?.[key]?.label} (+{formatPrice(bookingSettings.amenities?.[key]?.upcharge)})</li>
                            ))}
                        {globalBook?.data?.notes && (
                            <li><strong>Special Notes</strong>: {globalBook?.data?.notes}</li>
                        )}
                    </ul>
                </div>

                <hr className="mt-3 mb-3" />


                <fieldset className="row">
                    <div className="col-md-6">
                        <span className="fs-4">
                            <strong>Total:</strong> {formatPrice(globalBook?.data?.cost)}
                        </span>
                    </div>

                    <div className="col-md-6 col-12 mt-3 mt-md-0 d-flex justify-content-between justify-content-md-end gap-2">
                        <button type="button" className="btn rounded-pill btn-lg btn-outline-secondary" onClick={goBack} disabled={submitting}>
                            Back
                        </button>

                        <button type="submit" className="btn rounded-pill btn-lg btn-primary" disabled={submitting}>
                            {submitting ? "Redirecting to payment…" : "Confirm & Pay"}
                        </button>
                    </div>
                </fieldset>


                {error && (
                    <p className="text-danger">{error}</p>
                )}
            </form>
        </div>
    )
}

export default PayDetails;
