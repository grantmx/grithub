import Link from "next/link";
import Style from "./NextEvent.module.scss"
import Card from "components/display/Card";
import CardHeader from "components/display/CardHeader";


function NextEvent(){
    return(
        <Card>
            <CardHeader title="What's Up Today?" subTitle="Main Conference Room"/>    

            <ul className={Style.block}>
                <li className={Style.item}>
                    <div className={Style.details}>
                        <div className={Style.time}>
                            9:00 <span className={Style.meridiem}>AM</span> - 2:00 <span className={Style.meridiem}>PM</span>
                        </div>
                        <div className={Style.title}>
                            GRIT Hub Incubator Cohort
                        </div>
                        <div>
                            Lead by <a href="">Marshall Grant</a>
                        </div>
                    </div>

                    <Link href="/" className={Style.more}>
                        View
                    </Link>
                </li>

                <li className={Style.item}>
                    <div className={Style.details}>
                        <div className={Style.time}>
                            3:00 <span className={Style.meridiem}>PM</span> - 4:00 <span className={Style.meridiem}>PM</span>
                        </div>
                        <div className={Style.title}>
                            Weekly Coder Dojo
                        </div>
                        <div>
                            Lead by <a href="">Marshall Grant</a>
                        </div>
                    </div>

                    <Link href="/" className={Style.more}>
                        View
                    </Link>
                </li>
            </ul>
        </Card>
    )
}


export default NextEvent;