"use client"

import Card from "components/display/Card"
import Table from "components/display/Table"
import { internsColumns } from "./intern.helpers"
import { useContext } from "react"
import { InternContext } from "./_context/InternContext"



function Interns(){
    const [ data, dispatch ] = useContext(InternContext);

    return(
        <Card>
            {data?.interns && (
                <Table 
                    tableColumns={internsColumns} 
                    tableData={data.interns}
                />
            )}
        </Card> 
    )
}


export default Interns