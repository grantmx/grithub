import clsx from "clsx";
import Badge from "components/display/Badge"
import Style from "./Loadshedding.module.scss"
import Card from "components/display/Card";
import CardHeader from "components/display/CardHeader";


function Loadshedding(){
    return(
        <Card className={Style.loadshedding}>
            <CardHeader 
                title="Load Shedding" 
                subTitle="George Municipality"
                toolbar={(
                    <Badge variant="square">
                        Stage 6
                    </Badge> 
                )}
            />

            <ul className={Style.block}>
                <li className={Style.item}>
                    <svg id="icon-dot-single" xmlSpace="preserve" viewBox="0 0 24 24" className={Style.icon}>
                        <path d="M12 2.016c5.531 0 9.984 4.453 9.984 9.984s-4.453 9.984-9.984 9.984-9.984-4.453-9.984-9.984 4.453-9.984 9.984-9.984z"></path>
                    </svg>

                    <strong className={Style.time}>
                        4:00 AM - 6:30 AM
                    </strong>

                    <em className={Style.stage}>
                        Stage 4
                    </em>
                </li>

                <li className={Style.item}>
                    <svg id="icon-dot-single" xmlSpace="preserve" viewBox="0 0 24 24" className={clsx(Style.icon, Style.red)}>
                        <path d="M12 2.016c5.531 0 9.984 4.453 9.984 9.984s-4.453 9.984-9.984 9.984-9.984-4.453-9.984-9.984 4.453-9.984 9.984-9.984z"></path>
                    </svg>

                    <strong className={Style.time}>
                        12:00 PM - 4:30 PM
                    </strong>

                    <em className={Style.stage}>
                        Stage 6
                    </em>

                    <Badge variant="square" color="charcoal" className={Style.badge}>
                        4h 30m
                    </Badge>
                </li>


                <li className={Style.item}>
                    <svg id="icon-dot-single" xmlSpace="preserve" viewBox="0 0 24 24" className={Style.icon}>
                        <path d="M12 2.016c5.531 0 9.984 4.453 9.984 9.984s-4.453 9.984-9.984 9.984-9.984-4.453-9.984-9.984 4.453-9.984 9.984-9.984z"></path>
                    </svg>

                    <strong className={Style.time}>
                        8:00 PM - 10:30 PM
                    </strong>

                    <em className={Style.stage}>
                        Stage 5
                    </em>
                </li>
            </ul>
        </Card>
    )
}


export default Loadshedding