import { useContext } from "react";
import { useRouter } from "next/navigation";
import { bookingSettings } from "@/lib/constants";
import { StepperContext } from "@/components/navigation/Stepper/context/StepperContext";

// form control handlers + step-1 submit for the booking details form
export default function useBookingActions(){
    const router = useRouter()
    const [ globalBook, dispatch ] = useContext(StepperContext)

    function updateData(fields){
        dispatch({
            type: "setData",
            data: {
                ...globalBook?.data,
                ...fields
            }
        })
    }


    function handelControl(e){
        const name = e.target.name;
        const value = e.target.value;

        const workspace = (name === "workspace") && Object.values(bookingSettings.workSpaces).find(space => space.label === value)

        updateData({
            [name]: value,
            id: workspace.id ?? globalBook?.data.id
        })
    }


    function addDay(){
        updateData({
            additional_days: [
                ...(globalBook?.data?.additional_days ?? []),
                { date: "", arrival: "" }
            ]
        })
    }


    function updateDay(index, fields){
        const additional_days = [ ...(globalBook?.data?.additional_days ?? []) ]
        additional_days[index] = { ...additional_days[index], ...fields }

        updateData({ additional_days })
    }


    function removeDay(index){
        const additional_days = (globalBook?.data?.additional_days ?? []).filter((_, i) => i !== index)

        updateData({ additional_days })
    }


    function submitForm(e){
        e.preventDefault()

        dispatch({
            type: "nextStep",
            data: 2
        })

        router.push(`/cowork/book?step=2`)
    }


    return { handelControl, updateData, addDay, updateDay, removeDay, submitForm }
}
