// https://www.youtube.com/watch?v=CGrNNGrKCJU
import { useRef } from "react"



function FirestoreDownloadLink({ url, name }){
    const [ downloadURL, setDownloadURL ] = useState("")
    const linkRef = useRef()

    function download(e){
        e.preventDefault()

        const xhr = new XMLHttpRequest()

        xhr.responseType = "blob";

        xhr.onload = () => {
            const blob = xhr.response;
            const blobURL = window.URL.createObjectURL(blob)

            setDownloadURL(blobURL)

            linkRef.current.click()

            window.URL.revokeObjectURL(blobURL)
        }

        xhr.open("GET", url)
        xhr.send()
    }


    return(
        <>
            <button type="button" onClick={download}>
                {name}
            </button>

            <a 
                ref={linkRef}
                href={downloadURL} 
                target="_blank" 
                rel="noreferrer" 
                style={{ visibility: "hidden" }} 
            />
        </>
    )
}


export default FirestoreDownloadLink;