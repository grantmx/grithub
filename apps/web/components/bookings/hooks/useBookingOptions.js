import { useMemo } from "react";
import { bookingSettings } from "@/lib/constants";
import range from "@/lib/utils/range";

// selectable ranges for the guest-count and hours-booked dropdowns
export default function useBookingOptions(){
    const people = useMemo(() => range(1, bookingSettings.people), [])
    const hours = useMemo(() => range(1, bookingSettings.hours), [])

    return { people, hours }
}
