import Stepper from "../navigation/Stepper";
import Style from "./Bookings.module.scss"
import { useContext, useEffect } from "react";
import { useRouter } from "next/router";
import { StepperContext } from "../navigation/Stepper/context/StepperContext";
import BookingDetails from "./BookingDetails";
import CustomerDetails from "./CustomerDetails";
import axios from "axios";


const steps = [
    { name: "Booking Details", description: "Workspace requirements"},
    { name: "Your Details", description: "Tell us about you"},
    { name: "Finish & Pay", description: "Confirm payment details"},
]

function Bookings(){
    const router = useRouter()
    const [ globalBook, dispatch ] = useContext(StepperContext)

    useEffect(() => {
        axios.post("/api/payfast/generatePayId").then(data => {
            console.log(data)
        }).catch(err => {
            console.log(err.response)
        })

    }, [])

    return(
        <div className={Style.block}>
            <Stepper {...{ steps, current: globalBook.current }} />

            {router.query.step === "1" && (
                <BookingDetails />
            )}


            {router.query.step === "2" && (
                <CustomerDetails />
            )}
        </div>
    )
}


export default Bookings;