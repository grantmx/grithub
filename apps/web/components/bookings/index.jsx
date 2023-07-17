import clsx from "clsx";
import Stepper from "../navigation/Stepper";
import Style from "./Bookings.module.scss"
import { bookingSettings } from "../../lib/constants";
import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/router";
import range from "../../lib/utils/range";
import { StepperContext } from "../navigation/Stepper/context/StepperContext";
import formatPrice from "../../lib/utils/formatPrice";


const steps = [
    { name: "Booking Details", description: "Workspace requirements"},
    { name: "Your Details", description: "Tell us about you"},
    { name: "Finish & Pay", description: "Confirm payment details"},
]

function Bookings(){
    const router = useRouter()
    const [ globalBook, dispatch ] = useContext(StepperContext)
    const [ rate, setRate ] = useState(null)
    const [ total, setTotal ] = useState(null)
    const [ people, setPeople ] = useState([])
    const [ hours, setHours ] = useState()



    useEffect(() => {
        const workspace = globalBook?.data?.bookingDetails?.workspace;
        const duration =  globalBook?.data?.bookingDetails?.duration;
        const guests = globalBook?.data?.bookingDetails?.guests;

        if( workspace && duration ){
            let durationRate = bookingSettings.rates?.[duration].find(rate => globalBook?.data?.bookingDetails.id === rate.id)
            let cost = 0


            if( durationRate && duration === "hourly" ){
                let hours = parseInt(globalBook?.data?.bookingDetails?.hours);

                switch(durationRate.id){
                    case "event_conference_room":
                    case "dedicated_office":
                        cost = durationRate.value * hours;
                        setTotal(cost)
                        break;

                    case "hot_desk":
                        cost = (durationRate.value * (guests ? parseInt(globalBook?.data?.bookingDetails?.guests) : 1)) * hours;
                        setTotal(cost)
                        break;

                    default: return;
                }

            }


            if( durationRate && duration === "daily"){
                switch(durationRate.id){
                    case "event_conference_room":
                    case "dedicated_office":
                        cost = durationRate.value;
                        setTotal(cost)
                        break;

                    case "hot_desk":
                        cost = (durationRate.value * (guests ? parseInt(globalBook?.data?.bookingDetails?.guests) : 1));
                        setTotal(cost)
                        break;

                    default: return;
                }
            }
        }

    }, [ globalBook?.data?.bookingDetails ])




    useEffect(() => {
        if( total ){
            dispatch({
                type: "setData",
                data: {
                    bookingDetails: {
                        ...globalBook?.data?.bookingDetails,
                        cost: total
                    }
                }
            })
        }

    }, [ total ])



    useEffect(() => {
        setRate(router?.query)

        const maxPeople = range(1, bookingSettings.people)
        setPeople(maxPeople)

        const maxHours = range(1, bookingSettings.hours)
        setHours(maxHours)

        dispatch({
            type: "setData",
            data: {
                bookingDetails: {
                    workspace: router?.query?.label ?? "",
                    guests: "1",
                    date: "",
                    arrival: "",
                    hours: "1",
                    duration: router?.query?.duration ?? "",
                    cost: 0,
                    id: router?.query?.id ?? ""
                }
            }
        })

    }, [ router?.query ])



    function handelControl(e){
        const name = e.target.name;
        const value = e.target.value;

        const workspace = (name === "workspace") && Object.values(bookingSettings.workSpaces).find(space => space.label === value)

        dispatch({
            type: "setData",
            data: {
                bookingDetails: {
                    ...globalBook?.data?.bookingDetails,
                    [name]: value,
                    id: workspace.id ?? globalBook?.data?.bookingDetails.id
                }
            }
        })
    }


  



    return(
        <form className={clsx(Style.block, "form-floating")}>
            <Stepper {...{ steps }} />

            <div className={clsx(Style.form, "col-8")}>
                <h2 className="fs-4 lh-1 mb-4">
                    Select a workspace:
                </h2>

                <fieldset className="row">
                    <div className="col-md-6">
                        <div className="form-floating">
                            <select 
                                required 
                                className={clsx(Style.select, "form-select")} 
                                id="workspace" 
                                name="workspace"
                                value={globalBook?.data?.bookingDetails?.workspace ?? ""}
                                onChange={handelControl}
                            >   
                                {Object.values(bookingSettings?.workSpaces).map((workspace, i) => {
                                    return(
                                        <option 
                                            value={workspace.label} 
                                            key={workspace +"-"+ i}
                                        >
                                            {workspace?.label}
                                        </option>
                                    )
                                })}
                            </select>

                            <label htmlFor="workspace">
                                Choose Workspace Type
                            </label>
                        </div>
                    </div>

                    {globalBook?.data?.bookingDetails?.id !== "dedicated_office" && (
                        <div className="col-md-6">
                            <div className="form-floating">
                                <select 
                                    required 
                                    className={clsx(Style.select, "form-select")} 
                                    id="guests" 
                                    name="guests"
                                    value={globalBook?.data?.bookingDetails?.guests ?? ""}
                                    onChange={handelControl}
                                >
                                    <option>-- choose --</option>

                                    {people.map(folk => {
                                        return(
                                            <option value={folk} key={folk + " people"}>
                                                {folk}
                                            </option>
                                        )
                                    })}
                                </select>

                                <label htmlFor="guests">
                                    For how many guests?
                                </label>
                            </div>
                        </div>
                    )}
                </fieldset>



                <h2 className="fs-4 lh-1 mb-4 mt-5">
                    Select a date and time:
                </h2>

                <fieldset className="row g-4">
                    <div className="col-md-6">
                        <div className="form-floating">
                            <input 
                                required 
                                className="form-control" 
                                id="time" 
                                type="date"
                                name="date"
                                onBlur={handelControl}
                                // value={globalBook?.data?.bookingDetails?.date ?? ""}
                                min={new Date().toISOString().split("T")[0]}
                            />

                            <label htmlFor="time">
                                Arrival Date
                            </label>
                        </div>
                    </div>

                    <div className="col-md-6">
                        <div className="form-floating">
                            <input 
                                required 
                                className="form-control" 
                                id="time" 
                                type="time"
                                min="09:00" 
                                max="17:00"
                                name="arrival"
                                value={globalBook?.data?.bookingDetails?.arrival ?? ""}
                                onBlur={handelControl}
                                onChange={() => null}
                            />

                            <label htmlFor="arrival">
                                Arrival time (between 9:00 - 17:00)
                            </label>
                        </div>
                    </div>


                    <div className="col-md-6">
                        <div className="form-floating">
                            <select 
                                required 
                                className={clsx(Style.select, "form-select")} 
                                id="duration" 
                                name="duration"
                                value={globalBook?.data?.bookingDetails?.duration ?? ""}
                                onChange={handelControl}
                            >
                                {bookingSettings?.workSpaces?.[globalBook?.data?.bookingDetails?.id]?.duration.map( duration => {
                                    return(
                                        <option 
                                            value={duration} 
                                            key={duration}
                                        >
                                            {duration}
                                        </option>
                                    )
                                })}
                            </select>

                            <label htmlFor="duration">
                                Duration
                            </label>
                        </div>
                    </div>

                    
                    {globalBook?.data?.bookingDetails?.duration === "hourly" && (
                        <div className="col-md-6">
                            <div className="form-floating">
                                <select 
                                    required 
                                    className={clsx(Style.select, "form-select")} 
                                    id="hours" 
                                    name="hours"
                                    value={globalBook?.data?.bookingDetails?.hours ?? ""}
                                    onChange={handelControl}
                                >
                                    {hours.map(hr => {
                                        return(
                                            <option value={hr} key={hr +" hour"}>
                                                {hr}
                                            </option>
                                        )
                                    })}
                                </select>

                                <label htmlFor="duration">
                                    How many hours
                                </label>
                            </div>
                        </div>
                    )}


                </fieldset>


                <hr className="mt-5 mb-3" />


                <fieldset className="row">
                    <div className="col-md-6">
                        <span className="fs-4">
                            Booking total: {formatPrice(total ?? rate?.value)}
                        </span>
                    </div>

                    <div className="col-md-6 d-flex justify-content-end">
                        <button type="button" className="btn btn-lg btn-primary">
                            Continue
                        </button>
                    </div>
                </fieldset>
            </div>
        </form>
    )
}


export default Bookings;