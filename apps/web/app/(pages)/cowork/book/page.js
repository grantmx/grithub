import { Suspense } from "react";
import Bookings from "/components/bookings";
import { StepperContextProvider } from "/components/navigation/Stepper/context/StepperContext";


async function Book(){
    return(
        <Suspense>
        <section className="container-xxl d-flex p-md-5 p-4 flex-column mb-5" id="coworking">
            <div className="col-12 d-flex flex-column mt-3">
                <StepperContextProvider>
                    <Bookings />
                </StepperContextProvider>
            </div>
        </section>
        </Suspense>
    )
}


export default Book;