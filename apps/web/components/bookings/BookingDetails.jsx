import clsx from "clsx";
import Style from "./Bookings.module.scss"
import formatPrice from "../../lib/utils/formatPrice";
import getMinBookingDate from "../../lib/utils/getMinBookingDate";
import { isWeekend, isPublicHoliday } from "../../lib/utils/publicHolidays";
import dayjs from "dayjs";
import { useContext } from "react";
import { bookingSettings } from "../../lib/constants";
import { StepperContext } from "../navigation/Stepper/context/StepperContext";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { StaticDateTimePicker } from "@mui/x-date-pickers/StaticDateTimePicker";
import useMediaQuery from "@mui/material/useMediaQuery";
import Paper from "@mui/material/Paper";
import useBookingOptions from "./hooks/useBookingOptions";
import useBookingDefaults from "./hooks/useBookingDefaults";
import useBookingCost from "./hooks/useBookingCost";
import useBookingActions from "./hooks/useBookingActions";
import React from "react";

// bookable hours are 9:00 - 17:00
const MIN_TIME = dayjs().hour(9).minute(0).second(0);
const MAX_TIME = dayjs().hour(17).minute(0).second(0);

// no bookings on weekends or South African public holidays
function shouldDisableDate(date){
    return isWeekend(date) || isPublicHoliday(date);
}

// the date/arrival fields are stored as separate "YYYY-MM-DD" / "HH:mm" strings - combine/split around the picker's single dayjs value
function toDateTimeValue(date, arrival){
    if( !date || !arrival ) return null;

    const value = dayjs(`${date} ${arrival}`, "YYYY-MM-DD HH:mm")
    return value.isValid() ? value : null;
}


// once a date/time is picked, collapse the picker into this summary - "x" clears it and brings the picker back
function DateTimeSummary({ date, arrival, onClear }){
    const value = toDateTimeValue(date, arrival)

    return(
        <Paper variant="outlined" className={clsx(Style.dateSummary, "d-flex align-items-center justify-content-between p-3")}>
            <span>{value?.format("dddd, D MMMM YYYY [at] HH:mm")}</span>

            <button
                type="button"
                className={clsx(Style.removeBtn, "btn btn-outline-danger btn-sm rounded-circle")}
                onClick={onClear}
                aria-label="Change date and time"
            >
                &times;
            </button>
        </Paper>
    )
}


function fromDateTimeValue(newValue){
    if( !newValue?.isValid() ) return null;

    return {
        date: newValue.format("YYYY-MM-DD"),
        arrival: newValue.format("HH:mm")
    }
}


function BookingDateTimePicker({ date, arrival, onChangeData, onAccept, width, toolbarMinWidth }){
    const isMobile = useMediaQuery("(max-width:500px)")

    return(
        <StaticDateTimePicker
            ampm={false}
            sx={{
                width: isMobile ? "100%" : width,
                "& .MuiPickersLayout-toolbar": { minWidth: toolbarMinWidth }
            }}
            orientation={isMobile ? "portrait" : "landscape"}
            value={toDateTimeValue(date, arrival)}
            onChange={(newValue) => onChangeData(fromDateTimeValue(newValue) ?? { date: "", arrival: "" })}
            onAccept={onAccept}
            minDate={dayjs(getMinBookingDate(), "YYYY-MM-DD")}
            shouldDisableDate={shouldDisableDate}
            minTime={MIN_TIME}
            maxTime={MAX_TIME}
            referenceDate={MIN_TIME}
        />
    )
}


function BookingDetails(){
    const [ globalBook ] = useContext(StepperContext)
    const { people, hours } = useBookingOptions()
    const total = useBookingCost()
    const { handelControl, updateData, addDay, updateDay, removeDay, submitForm } = useBookingActions()

    useBookingDefaults()

    // StaticDateTimePicker renders no <input>, so there's no native `required` to lean on - check manually
    const dateTimeComplete = Boolean(globalBook?.data?.date && globalBook?.data?.arrival) &&
        (globalBook?.data?.duration !== "daily" || (globalBook?.data?.additional_days ?? []).every(day => day.date && day.arrival))


    return(
        <div className={clsx(Style.form, "col-md-8 col-12")}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
            <form className="form-floating" onSubmit={submitForm}>

                <h3 className="fs-2 fw-bold lh-1 mb-4">
                    Select a workspace:
                </h3>

                <fieldset className="row g-4">
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



                <h3 className="fs-2 fw-bold lh-1 mb-0 mt-5">
                    Select a date and time:
                </h3>
                <p className="text-muted mb-4">Additional day date &amp; time (weekdays, 9:00 - 17:00, excluding public holidays)</p>


                <fieldset className="row g-4">
                    <div className="col-12">
                        {globalBook?.data?.confirmed ? (
                            <DateTimeSummary
                                date={globalBook.data.date}
                                arrival={globalBook.data.arrival}
                                onClear={() => updateData({ date: "", arrival: "", confirmed: false })}
                            />
                        ) : (
                            <BookingDateTimePicker
                                date={globalBook?.data?.date}
                                arrival={globalBook?.data?.arrival}
                                onChangeData={updateData}
                                onAccept={() => updateData({ confirmed: true })}
                                width="600px"
                                toolbarMinWidth="fit-content"
                            />
                        )}
                    </div>
                </fieldset>


                {globalBook?.data?.duration === "daily" && (
                    <>
                        {(globalBook?.data?.additional_days ?? []).map((day, index) => (
                            <fieldset key={index} className="row g-4 mt-1 position-relative">
                                <div className="col-12">
                                    {day.confirmed ? (
                                        <DateTimeSummary
                                            date={day.date}
                                            arrival={day.arrival}
                                            onClear={() => updateDay(index, { date: "", arrival: "", confirmed: false })}
                                        />
                                    ) : (
                                        <BookingDateTimePicker
                                            date={day.date}
                                            arrival={day.arrival}
                                            onChangeData={(fields) => updateDay(index, fields)}
                                            onAccept={() => updateDay(index, { confirmed: true })}
                                            width="550px"
                                            toolbarMinWidth="unset"
                                        />
                                    )}
                                </div>

                               
                            </fieldset>
                        ))}

                        <div className="col-12 pt-3 d-block">
                            <button type="button" className="btn btn-outline-primary rounded-pill" onClick={addDay}>
                                + Add another day
                            </button>
                        </div>
                    </>
                )}


                {globalBook?.data?.id === "sandbox" && (
                    <fieldset className="row mt-4">
                        <div className="col-12">
                            <div className="form-check">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id="stoep_addon"
                                    name="stoep_addon"
                                    checked={globalBook?.data?.stoep_addon ?? false}
                                    onChange={(e) => updateData({ stoep_addon: e.target.checked })}
                                />&nbsp;

                                <label className="form-check-label" htmlFor="stoep_addon">
                                    Add our outdoor space (optional, no extra cost)
                                </label>
                            </div>
                        </div>
                    </fieldset>
                )}


                {(globalBook?.data?.id === "board_room" || globalBook?.data?.id === "sandbox") && (
                    <fieldset className="row mt-4">
                        <div className="col-12">
                            <div className="form-check">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id="catering_requested"
                                    name="catering_requested"
                                    checked={globalBook?.data?.catering_requested ?? false}
                                    onChange={(e) => updateData({ catering_requested: e.target.checked })}
                                />&nbsp;

                                <label className="form-check-label" htmlFor="catering_requested">
                                    Request catering (arranged separately, billed against your budget)
                                </label>
                            </div>
                        </div>

                        {globalBook?.data?.catering_requested && (
                            <div className="col-md-6 mt-3">
                                <div className="form-floating">
                                    <input
                                        className="form-control"
                                        id="catering_budget"
                                        type="number"
                                        min="0"
                                        name="catering_budget"
                                        onChange={handelControl}
                                        value={globalBook?.data?.catering_budget ?? ""}
                                    />

                                    <label htmlFor="catering_budget">
                                        Catering Budget (ZAR)
                                    </label>
                                </div>
                            </div>
                        )}
                    </fieldset>
                )}


                {globalBook?.data?.id === "sandbox" && (
                    <fieldset className="row mt-4">
                        <div className="col-12">
                            <h4 className="fs-5 mb-2">Optional Add-ons</h4>
                        </div>

                        {Object.entries(bookingSettings.amenities)
                            .filter(([ , amenity ]) => typeof amenity === "object" && amenity.upcharge)
                            .map(([ key, amenity ]) => {
                                return(
                                    <div className="col-md-4" key={key}>
                                        <div className="form-check">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id={key}
                                                checked={globalBook?.data?.amenities?.[key] ?? false}
                                                onChange={(e) => updateData({
                                                    amenities: {
                                                        ...globalBook?.data?.amenities,
                                                        [key]: e.target.checked
                                                    }
                                                })}
                                            />&nbsp;

                                            <label className="form-check-label" htmlFor={key}>
                                                {amenity.label} (+{formatPrice(amenity.upcharge)})
                                            </label>
                                        </div>
                                    </div>
                                )
                            })}
                    </fieldset>
                )}


                <hr className="mt-5 mb-3" />


                <fieldset className="col-12 d-flex justify-content-between align-items-center">
                    <div className="col-md-6">
                        <span className="fs-4">
                            {total && (
                                <>
                                    <strong>Subtotal:</strong> {formatPrice(total)}
                                </>
                            )}
                        </span>
                    </div>

                    <div className="col-md-6 d-flex justify-content-end">
                        <button type="submit" className="btn rounded-pill btn-lg btn-primary" disabled={!total || !dateTimeComplete}>
                            Continue
                        </button>
                    </div>
                </fieldset>

            </form>
            </LocalizationProvider>
        </div>
    )
}


export default BookingDetails;