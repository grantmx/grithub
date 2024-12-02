"use client"

import Stepper from "../navigation/Stepper";
import Style from "./Bookings.module.scss"
import { Suspense, useContext } from "react";
import { useSearchParams } from "next/navigation";
import { StepperContext } from "../navigation/Stepper/context/StepperContext";
import BookingDetails from "./BookingDetails";
import CustomerDetails from "./CustomerDetails";


const steps = [
    { name: "Booking Details", description: "Your workspace requirements"},
    { name: "Your Details", description: "Tell us about you"},
    { name: "Confirm & Pay", description: "Review booking & settle"},
]

function Bookings(){
    const query = useSearchParams()
    const [ globalBook, dispatch ] = useContext(StepperContext)

    return(
        <Suspense>
        <div className={Style.block}>
            <Stepper {...{ steps, current: globalBook.current }} />

            {query.step === "1" && (
                <BookingDetails />
            )}


            {query.step === "2" && (
                <CustomerDetails />
            )}
        </div>
        </Suspense>
    )
}


export default Bookings;