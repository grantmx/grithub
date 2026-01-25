"use client"


function CopyrightDate() {
    return(
        <>
            &copy; 2017-{new Date().getFullYear()}
        </>
    )
}

export default CopyrightDate;