import Style from "./styles/Handheld.module.scss"
import utils from "ui/styles/globals/utils.module.scss"
import clsx from "clsx";
import Grid from "ui/components/layout/Grid";
import GridColumn from "ui/components/layout/GridColumn";
import Header from "./Header";
import Card from "ui/components/display/Card";
import Divider from "ui/components/display/Divider";


function EntranceOptions(){
    return(
        <Grid>
            <GridColumn start={2} end={10} className={Style.col}>
                <Header subText="I'm coming into the Hub today for:">
                    {new Date().toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                    })}
                </Header>

                <Grid md={2} element="form" gap={20}>
                    <Card element="label" noMargin theme="opaque" className={clsx(Style.touchCard)}>
                        <input type="checkbox" id="option1" className={clsx(Style.checkbox)} />
                    
                        <h2 className={Style.cardHeading}>
                            George Business Chamber Networking Meeting @ 9am
                        </h2>
                    </Card>

                </Grid>


                <Divider className={utils.my_5} />


                <Grid md={2} element="form" gap={20}>
                    <Card element="label" noMargin theme="opaque" className={clsx(Style.touchCard)}>
                        <input type="checkbox" id="option1" className={clsx(Style.checkbox)} />

                        <h2 className={Style.cardHeading}>
                        Coworking Reservation
                        </h2>
                    </Card>

                
                    <Card element="label" noMargin theme="opaque" className={clsx(Style.touchCard)}>
                        <input type="checkbox" id="option1" className={clsx(Style.checkbox)} />
                    
                        <h2 className={Style.cardHeading}>
                        General Meeting
                        </h2>
                    </Card>
                </Grid>

            </GridColumn>
        </Grid>
    )
}

export default EntranceOptions