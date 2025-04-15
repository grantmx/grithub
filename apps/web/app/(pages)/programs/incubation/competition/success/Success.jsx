"use client"

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
// import { celebrationTime } from "lib/utils/celebrationTime";
import axios from "axios"


function Success(){
    const searchParams = useSearchParams()
    const firstName = searchParams.get('first_name')
    const email = searchParams.get('email')

    // useEffect(() => {
	// 	celebrationTime()

	// }, [])

    useEffect(() => {
        if( email && firstName ){
            
            axios.post("/api/email/internship", {
                subject: `Thank you for your Innovative Ideas Competition submission, ${firstName}! 🎉`,
                to: email,
                heading: `Hey, ${firstName}! 👋`,
                message: `
                    <p>Your application submission to the Innovative Ideas Competition was successful.  Thanks!</p>
                    <p>If you are a finalist, we will be in contact with you regarding follow-up and additional information. All the best, and thank you again for your interest.</p>
                    <p>- Marshall</p>
                `
            })    
        }

    }, [ email, firstName ])


}

export default Success