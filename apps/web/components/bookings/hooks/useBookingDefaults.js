import { useContext, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { bookingSettings } from "@/lib/constants";
import { StepperContext } from "@/components/navigation/Stepper/context/StepperContext";

// seeds globalBook.data on mount - either from the widget's ?type=/&duration= query params, or the hot_desk default
export default function useBookingDefaults(){
    const searchParams = useSearchParams()
    const [ globalBook, dispatch ] = useContext(StepperContext)

    useEffect(() => {

        // already have booking data (e.g. navigating back to this step) - don't clobber it
        if( globalBook?.data?.workspace ) return;

        const workspace = bookingSettings?.workSpaces?.[searchParams.get("type")]

        // if coming from the widget (or a direct link) use that query data
        if( workspace ){
            dispatch({
                type: "setData",
                data: {
                    workspace: workspace.label,
                    guests: "1",
                    date: "",
                    arrival: "",
                    hours: "1",
                    duration: searchParams.get("duration") ?? workspace.duration[0],
                    cost: 0,
                    id: workspace.id
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

    }, [ searchParams ])
}
