import Badge from "components/display/Badge";
import Style from "./TodaysBooking.module.scss"
import Card from "components/display/Card";
import CardHeader from "components/display/CardHeader";

function TodaysBooking(){
    return(
        <Card>
            <CardHeader title="Today's Bookings" subTitle="@ George GRIT Hub"/>
                    
            <table>
                <thead>
                    <tr className={Style.headerRow}>
                        <td className={Style.headerCell}>
                            Name
                        </td>
                        <td className={Style.headerCell}>
                            Scheduled
                        </td>
                        <td className={Style.headerCell}>
                            Status
                        </td>
                    </tr>
                </thead>

                <tbody>
                    <tr className={Style.row}>
                        <td className={Style.cell}>
                            Aya Grant
                        </td>
                        <td className={Style.cell}>
                            9:00 AM
                        </td>
                        <td className={Style.cell}>
                            <Badge variant="square">
                                Not Paid
                            </Badge>
                        </td>
                    </tr>

                    <tr className={Style.row}>
                        <td className={Style.cell}>
                            Nadjah Grant
                        </td>
                        <td className={Style.cell}>
                            12:00 PM
                        </td>
                        <td className={Style.cell}>
                            <Badge variant="square" color="green">
                                Paid
                            </Badge>
                        </td>
                    </tr>

                    <tr className={Style.row}>
                        <td className={Style.cell}>
                            Liya Grant
                        </td>
                        <td className={Style.cell}>
                            12:00 PM
                        </td>
                        <td className={Style.cell}>
                            <Badge variant="square" color="green">
                                Paid
                            </Badge>
                        </td>
                    </tr>
                </tbody>
            </table>
        </Card>
    )
}


export default TodaysBooking;