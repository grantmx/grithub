import Stepper from "../navigation/Stepper";
import Style from "./Bookings.module.scss"
import { useContext } from "react";
import { useRouter } from "next/router";
import { StepperContext } from "../navigation/Stepper/context/StepperContext";
import BookingDetails from "./BookingDetails";
import CustomerDetails from "./CustomerDetails";


const steps = [
    { name: "Booking Details", description: "Your workspace requirements"},
    { name: "Your Details", description: "Tell us about you"},
    { name: "Confirm & Pay", description: "Review booking & settle"},
]

function Bookings(){
    const router = useRouter()
    const [ globalBook, dispatch ] = useContext(StepperContext)

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