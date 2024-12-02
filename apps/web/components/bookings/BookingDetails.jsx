import clsx from "clsx";
import Style from "./Bookings.module.scss"
import formatPrice from "../../lib/utils/formatPrice";
import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { bookingSettings } from "../../lib/constants";
// import range from "../../lib/utils/range";
import { StepperContext } from "../navigation/Stepper/context/StepperContext";



function BookingDetails(){
    const router = useRouter()
    const [ globalBook, dispatch ] = useContext(StepperContext)
    const [ total, setTotal ] = useState(null)
    const [ people, setPeople ] = useState([])
    const [ hours, setHours ] = useState()


    useEffect(() => {
        // const maxPeople = range(1, bookingSettings.people)
        // setPeople(maxPeople)

        // const maxHours = range(1, bookingSettings.hours)
        // setHours(maxHours)

    }, [])



    useEffect(() => {
        if( total ){
            dispatch({
                type: "setData",
                data: {
                    ...globalBook?.data,
                    cost: total
                }
            })
        }

    }, [ total ])





    useEffect(() => {        

        // if coming from the widget use that query data
        if(  router?.query?.label ){
            dispatch({
                type: "setData",
                data: {
                    workspace: router?.query?.label ?? "",
                    guests: "1",
                    date: "",
                    arrival: "",
                    hours: "1",
                    duration: router?.query?.duration ?? "",
                    cost: 0,
                    id: router?.query?.id ?? ""
                }
            })

        // if straight on, use the default
        }else{
            dispatch({
                type: "setData",
                data: {
                    workspace: bookingSettings?.workSpaces.hot_desk.label,
                    guests: "1",
                    date: "",
                    arrival: "",
                    hours: "1",
                    duration: bookingSettings?.workSpaces?.hot_desk?.duration[0],
                    cost: 0,
                    id: bookingSettings?.workSpaces.hot_desk?.id
                }
            })
        }
        

    }, [ router?.query ])



    function handelControl(e){
        const name = e.target.name;
        const value = e.target.value;

        const workspace = (name === "workspace") && Object.values(bookingSettings.workSpaces).find(space => space.label === value)

        dispatch({
            type: "setData",
            data: {
                ...globalBook?.data,
                [name]: value,
                id: workspace.id ?? globalBook?.data.id
            }
        })
    }




    useEffect(() => {
        const workspace = globalBook?.data?.workspace;
        const duration =  globalBook?.data?.duration;
        const guests = globalBook?.data?.guests;

        if( workspace && duration ){
            let durationRate = bookingSettings.rates?.[duration].find(rate => globalBook?.data.id === rate.id)
            let cost = 0


            if( durationRate && duration === "hourly" ){
                let hours = parseInt(globalBook?.data?.hours);

                switch(durationRate.id){
                    case "event_conference_room":
                    case "dedicated_office":
                        cost = durationRate.value * hours;
                        setTotal(cost)
                        break;

                    case "hot_desk":
                        cost = (durationRate.value * (guests ? parseInt(globalBook?.data?.guests) : 1)) * hours;
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
                        cost = (durationRate.value * (guests ? parseInt(globalBook?.data?.guests) : 1));
                        setTotal(cost)
                        break;

                    default: return;
                }
            }
        }

    }, [ globalBook?.data ])




    function submitForm(e){
        e.preventDefault()

        dispatch({
            type: "nextStep",
            data: 2
        })

        router.push({
            href: router.asPath,
            query: {
                step: 2
            }
        })
    }



    return(
        <div className={clsx(Style.form, "col-8")}>
            <form className="form-floating" onSubmit={submitForm}>
            
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
                                value={globalBook?.data?.workspace ?? bookingSettings?.workSpaces.hot_desk.label}
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

                    {globalBook?.data?.id !== "dedicated_office" && (
                        <div className="col-md-6">
                            <div className="form-floating">
                                <select 
                                    required 
                                    className={clsx(Style.select, "form-select")} 
                                    id="guests" 
                                    name="guests"
                                    value={globalBook?.data?.guests ?? ""}
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
                                onChange={handelControl}
                                value={globalBook?.data?.date}
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
                                value={globalBook?.data?.arrival}
                                onChange={handelControl}
                                // onChange={() => null}
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
                                value={globalBook?.data?.duration ?? bookingSettings?.workSpaces.hot_desk.duration[0]}
                                onChange={handelControl}
                            >
                                {bookingSettings?.workSpaces?.[globalBook?.data?.id] ? (
                                    <>
                                        {bookingSettings?.workSpaces?.[globalBook?.data?.id]?.duration.map( duration => {
                                            return(
                                                <option 
                                                    value={duration} 
                                                    key={duration}
                                                >
                                                    {duration}
                                                </option>
                                            )
                                        })}
                                    </>

                                ):(
                                    <>
                                        {bookingSettings?.workSpaces.hot_desk.duration.map( duration => {
                                            return(
                                                <option 
                                                    value={duration} 
                                                    key={duration}
                                                >
                                                    {duration}
                                                </option>
                                            )
                                        })}
                                    </>
                                )}
                                
                            </select>

                            <label htmlFor="duration">
                                Duration
                            </label>
                        </div>
                    </div>

                    
                    {globalBook?.data?.duration === "hourly" && (
                        <div className="col-md-6">
                            <div className="form-floating">
                                <select 
                                    required 
                                    className={clsx(Style.select, "form-select")} 
                                    id="hours" 
                                    name="hours"
                                    value={globalBook?.data?.hours ?? ""}
                                    onChange={handelControl}
                                >
                                    {hours && (
                                        <>
                                            {hours.map(hr => {
                                                return(
                                                    <option value={hr} key={hr +" hour"}>
                                                        {hr}
                                                    </option>
                                                )
                                            })}
                                        </>
                                    )}
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
                        <span className="fs-5">
                            {total && (
                                <>
                                    Booking total: {formatPrice(total)}
                                </>
                            )}
                        </span>
                    </div>

                    <div className="col-md-6 d-flex justify-content-end">
                        <button type="submit" className="btn rounded-pill btn-lg btn-primary" disabled={!total}>
                            Continue
                        </button>
                    </div>
                </fieldset>

            </form>
        </div>
    )
}


export default BookingDetails;