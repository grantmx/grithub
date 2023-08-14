import Card from "components/display/Card"
import Table from "components/display/Table"
import FirebaseService from "ui/services/firebase/Firebase.service"
import { internsColumns } from "./intern.helpers"

const firebaseService = new FirebaseService()


async function Interns(){
    const interns = await firebaseService.getCollection({
        rootCollection: "internships",
        rootDocument: "applications",
        documentCollection: "2023"
    })

    return(
        <Card>
            <Table 
                tableColumns={internsColumns} 
                tableData={interns}
            />
        </Card> 
    )
}


export default Interns