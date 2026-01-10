export const metadata = {
    title: "The GRIT Internship Application",
    description: "Apply for The GRIT Internship program.",
}


function InternshipApplication(){

    return(
        <section className="container-xxl d-flex p-md-5 p-4 flex-column mb-5" id="internship">
            <iframe 
                className="airtable-embed" 
                src="https://airtable.com/embed/appJBk9nhVZawihCj/paguZESANMJPRLmKj/form" 
                onMouseWheel="" 
                width="100%" 
                height="1000" 
                style={{ background: "transparent", border: "none" }}
            />
        </section>
    )
}


export default InternshipApplication;