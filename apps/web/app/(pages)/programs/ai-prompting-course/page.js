"use client"
import dynamic from "next/dynamic";

const Pdf = dynamic(() => import("components/display/Pdf"), { ssr: false, });


function AIPromptingCourse(){
    return(
        <>
            <section className="container-xxl d-flex pt-5 flex-column mb-5">
                <h1 className="display-2 fw-bold text-center">
                    AI Prompting Course Slides
                </h1>
            </section>

            <section className="container-xxl mb-5 d-flex justify-content-center flex-column align-items-center">
                <Pdf filePath="/AI-Prompting-Course.pdf" />
            </section>
        </>
    )
}

export default AIPromptingCourse;