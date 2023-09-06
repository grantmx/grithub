import Card from "components/display/Card";
import Style from "./_styles/people.module.scss"
import CardHeader from "components/display/CardHeader";



function people(){
    return(
        <section className={Style.block}>
            <Card>
                <CardHeader 
                    title="Interns" 
                />
            </Card>

            <Card>
                <CardHeader 
                    title="Cohorts" 
                />
            </Card>


            <Card>
                <CardHeader 
                    title="Event Registrations" 
                />
            </Card>

            <Card>
                <CardHeader 
                    title="Active Members" 
                />
            </Card>
        </section>
    )
}

export default people;