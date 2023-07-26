import Bookings from "components/bookings";
import GeneralPage from "components/layout/GeneralPage";
import { StepperContextProvider } from "components/navigation/Stepper/context/StepperContext";


function Book(){
    return(
        <GeneralPage 
            title="Bookings"
            centerTitle
		>
            <section className="container-xxl d-flex p-md-5 p-4 flex-column mb-5" id="coworking">
                <div className="col-12 d-flex flex-column mt-3">
                    <StepperContextProvider>
                        <Bookings />
                    </StepperContextProvider>
                </div>
            </section>
        </GeneralPage>
    )
}


export default Book;