"use client"

import Stepper from "../navigation/Stepper";
import Style from "./Bookings.module.scss"
import { Suspense, useContext } from "react";
import { useSearchParams } from "next/navigation";
import { StepperContext } from "../navigation/Stepper/context/StepperContext";
import BookingDetails from "./BookingDetails";
import CustomerDetails from "./CustomerDetails";
import PayDetails from "./PayDetails";


const steps = [
    { name: "Booking Details", description: "Your workspace requirements"},
    { name: "Your Details", description: "Tell us about you"},
    { name: "Confirm & Pay", description: "Review booking & settle"},
]

function Bookings(){
    const searchParams = useSearchParams()
    const queryStep = searchParams.get("step")
    const [ globalBook, dispatch ] = useContext(StepperContext)

    return(
        <Suspense>
            <section className="container-xxl d-flex flex-column mb-md-5" id="booking">
                <div className="col-12 d-flex flex-column flex-md-row">
                    <div className="col-12 col-md-8 pe-md-5">
                        <h1 className="display-2">
                            Make a booking
                        </h1>
                    </div>
                </div>

                <hr/>
            </section>

            <div className={Style.block}>
                <Stepper {...{ steps, current: globalBook?.current, path: "/cowork/book" }} />

                {queryStep === "1" &&  <BookingDetails />}
                {queryStep === "2" && <CustomerDetails />}
                {queryStep === "3" && <PayDetails />}
            </div>
        </Suspense>
    )
}


export default Bookings;