"use client"

import Personal from "components/profile/Personal";
import Style from "./Intern.module.scss"
import { useContext, useEffect, useState } from "react";
import { InternContext } from "../_context/InternContext";
import { useSearchParams } from "next/navigation";


function Intern(){
    const [ internData, setInternData ] = useState(null);
    const [ data, dispatch ] = useContext(InternContext);
    const searchParams = useSearchParams()

    useEffect(() => {
        if( data.interns ){
            const firstName = searchParams.get('firstName')
            const internData = data.interns.filter(intern => intern.first_name === firstName)

            if( internData ){
                setInternData(internData[0])
            }
        }

    }, [ data.interns, searchParams ])


    return(
        <section className={Style.block}>
            <ol className={Style.submissionCntr}>
                <Personal />
            </ol>
        </section>
    )
}


export default Intern;