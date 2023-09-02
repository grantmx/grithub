import FirebaseService from "ui/services/firebase/Firebase.service"
import { InternContextProvider } from "./_context/InternContext"

const firebaseService = new FirebaseService()

async function InterLayout({ children }){
    const interns = await firebaseService.getCollection({
        rootCollection: "internships",
        rootDocument: "applications",
        documentCollection: "2023"
    })


    return(
        <InternContextProvider interns={interns}>
            {children}
        </InternContextProvider>
    )
}

export default InterLayout;