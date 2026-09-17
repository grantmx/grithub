import { useContext, useEffect, useState } from "react";
import { bookingSettings } from "@/lib/constants";
import { StepperContext } from "@/components/navigation/Stepper/context/StepperContext";

// derives the booking subtotal from globalBook.data and syncs it back into the stepper context
export default function useBookingCost(){
    const [ globalBook, dispatch ] = useContext(StepperContext)
    const [ total, setTotal ] = useState(null)

    useEffect(() => {
        const workspace = globalBook?.data?.workspace;
        const duration =  globalBook?.data?.duration;
        const guests = globalBook?.data?.guests;

        if( workspace && duration ){
            let durationRate = bookingSettings.rates?.[duration].find(rate => globalBook?.data.id === rate.id)
            let cost = 0

            // only the Sandbox offers paid amenity add-ons (mic/camera upcharges)
            const selectedAmenities = globalBook?.data?.amenities ?? {};
            const addonsCost = globalBook?.data?.id === "sandbox"
                ? Object.entries(selectedAmenities).reduce((sum, [key, checked]) => {
                    return checked ? sum + (bookingSettings.amenities?.[key]?.upcharge ?? 0) : sum;
                }, 0)
                : 0;


            if( durationRate && duration === "hourly" ){
                let hours = parseInt(globalBook?.data?.hours);

                switch(durationRate.id){
                    case "board_room":
                    case "sandbox":
                        cost = (durationRate.value * hours) + addonsCost;
                        setTotal(cost)
                        break;

                    case "hot_desk":
                    case "sandbox_lounge":
                        cost = (durationRate.value * (guests ? parseInt(globalBook?.data?.guests) : 1)) * hours;
                        setTotal(cost)
                        break;

                    default: return;
                }

            }


            if( durationRate && duration === "daily"){
                const totalDays = 1 + (globalBook?.data?.additional_days ?? []).filter(day => day.date).length;

                switch(durationRate.id){
                    case "board_room":
                    case "sandbox":
                        cost = (durationRate.value * totalDays) + addonsCost;
                        setTotal(cost)
                        break;

                    case "hot_desk":
                    case "sandbox_lounge":
                        cost = (durationRate.value * (guests ? parseInt(globalBook?.data?.guests) : 1)) * totalDays;
                        setTotal(cost)
                        break;

                    default: return;
                }
            }


            if( durationRate && duration === "monthly"){
                switch(durationRate.id){
                    case "hot_desk":
                        cost = (durationRate.value * (guests ? parseInt(globalBook?.data?.guests) : 1));
                        setTotal(cost)
                        break;

                    default: return;
                }
            }
        }

    }, [ globalBook?.data ])


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


    return total
}
