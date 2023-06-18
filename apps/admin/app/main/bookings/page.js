import Style from './Bookings.module.scss'

import Card from "components/display/Card";
import Table from "components/display/Table";
import AddButton from "components/form/AddButton";

const bookingData = [
    {

    }
]


function Bookings(){
    return(
        <>
            <Card>
                <Table tableData={bookingData} />
            </Card>
           
            <AddButton />
        </>
    )
}


export default Bookings;