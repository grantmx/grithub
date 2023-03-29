import Card from "components/display/Card";
import React from 'react'
import FullCalendar from '@fullcalendar/react' // must go before plugins
import timeGridPlugin from '@fullcalendar/timegrid' // a plugin!
import AddButton from "components/form/AddButton";


function Events(){
    return(
        <>
            <Card>
                <FullCalendar
                    plugins={[ timeGridPlugin ]}
                    initialView="timeGridWeek"
                />
            </Card>

            {/* <AddButton /> */}
        </>
    )
}


export default Events;