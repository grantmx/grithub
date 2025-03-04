import Pdf from "components/display/Pdf";

export const metadata = {
    title: "AI Prompting Course",
    description: "AI Prompting Course",
    keywords: "AI Prompting Course",
}

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