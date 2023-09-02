import CardHeader from "components/display/CardHeader";
import Style from "./dashboard.module.scss"
import Card from "components/display/Card"
import Table from "components/display/Table";
import Loadshedding from "components/dashboard/Loadshedding";
import TodaysBooking from "components/dashboard/TodaysBooking";
import NextEvent from "components/dashboard/NextEvent";

export const metadata = {
	title: 'Dashboard',
}

function Page() {
    return(
        <>
            <section className={Style.block}>
                <NextEvent />

                <TodaysBooking />
               
                <Loadshedding />
            </section>

            <Card>
                <CardHeader 
                    title="Latest Entrants" 
                    subTitle="Walk-ins and Kiosk Registrations"
                    toolbar={<button>test</button>}
                />

                {/* <Table /> */}
            </Card>
        </>
    )
}


export default Page;