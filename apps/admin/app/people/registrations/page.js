import Card from "components/display/Card"
import CardHeader from "components/display/CardHeader"
import Table from "components/display/Table"

function Registrations(){
    return (
        <>
            <Card marginBottom="2">
                <CardHeader title="George Business Chamber" subTitle="eCommerce Seminar. Part 1: 1 June 2023"/>
                <Table />
            </Card> 

            <Card marginBottom="2">
                <CardHeader title="Javascript Class" subTitle="Introduction: 15 June 2023"/>
                <Table />
            </Card> 

            <Card marginBottom="2">
                <CardHeader title="Business Incubator" subTitle="GRIT Hub 2023 Cohort: 15 June 2023"/>
                <Table />
            </Card> 

            
        </>
    )
}


export default Registrations