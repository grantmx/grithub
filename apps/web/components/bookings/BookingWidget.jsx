import clsx from "clsx";
import Style from "./Bookings.module.scss"
import { useState } from "react";
// import Link from "next/link";
import { bookingSettings } from "../../lib/constants";
import { IconWhatsapp } from "../icons/IconWhatsapp";



function BookingWidget(){
    const [ rate, setRate ] = useState(bookingSettings.rates["hourly"][0])

    return(
        <form className={clsx(Style.widgetBlock, "shadow-lg form-floating")}>
            <p className="mb-0">
                <span className="fs-4">R{rate?.value}</span> &nbsp;
                <small className="text-muted">VAT inclusive</small>
            </p>

            <div className="form-floating my-2">
                <select 
                    required
                    className="form-select" 
                    id="type" 
                    onChange={(e) => setRate(JSON.parse(e.target.value))}
                >
                    {Object.keys(bookingSettings.rates).map((booking) => {
                        return(
                            <optgroup label={booking} key={booking}>
                                {bookingSettings.rates[booking].map((type, i) => {
                                    return(
                                        <option 
                                            value={JSON.stringify({ 
                                                ...bookingSettings?.rates[booking][i], 
                                                duration: booking, 
                                                label: bookingSettings?.workSpaces[type?.id]?.label 
                                            })} 
                                            key={booking +"-"+ i}
                                            defaultValue={rate?.value === type.value}
                                        >
                                           {bookingSettings?.workSpaces[type?.id]?.label} - {booking}
                                        </option>
                                    )
                                })}
                            </optgroup>
                        )
                    })}
                </select>

                <label htmlFor="type">
                    Choose Workspace Type
                </label>
            </div>

            <button type="button" className="btn btn-success btn-lg d-flex align-items-center justify-content-center" onClick={() =>{ window.location.href=`https://wa.me/270630705752?text=${encodeURI(`Hi, I'm looking to book ${rate?.label ?? "Hot Desk"} for your ${rate.duration ?? "R50"} rate.`)}`; }}>
                <IconWhatsapp width={25} height={25} style={{ fill: "#ffffff", marginRight: ".5rem" }} />
                WhatsApp Now to Book
            </button>

            {/* <Link
                href={{
                    pathname: '/cowork/book',
                    query: { 
                        ...rate, 
                        step: 1
                    },
                }}
                className="btn btn-primary"
            >
                Book Now
            </Link> */}

            <small className="mb-0 mt-2">Booking from the EU or UK? Book on our <a target="_blank" href="https://www.tallyworkspace.com/coworking-space/george/george-south/garden-route-innovation-technology-hub" rel="noreferrer">Tally Workspace page &rsaquo;</a></small>
        </form>
    )
}

export default BookingWidget;