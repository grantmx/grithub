"use client"

import Personal from "components/profile/Personal";
import Style from "./Intern.module.scss"
import { useContext, useEffect, useState } from "react";
import { InternContext } from "../_context/InternContext";
import { useSearchParams } from "next/navigation";
import Education from "components/profile/Education";
import Essay from "components/profile/Essay";
import Upload from "components/profile/Upload";
import Employment from "components/profile/Employment";
import Card from "components/display/Card";


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
        <Card>
            <ol className={Style.submissionCntr}>
                <Personal {...internData} />
                <Education {...internData} />
                <Employment {...internData} />
                <Essay {...internData} />
                <Upload {...internData} />
            </ol>
        </Card>
    )
}


export default Intern;