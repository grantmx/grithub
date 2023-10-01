import Style from "./styles/Handheld.module.scss"
import utils from "ui/styles/globals/utils.module.scss"

import Grid from "ui/components/layout/Grid";
import GridColumn from "ui/components/layout/GridColumn";
import clsx from "clsx";
import Link from "next/link";
import { useEffect } from "react";
import Card from "ui/components/display/Card";
import useCurrent from "./hooks/useCurrent";
import Header from "./Header";
import { celebrationTime } from "ui/lib/celebrationTime";
import { useRouter } from "next/navigation";



function Confirmation({ step }){
    const router = useRouter()
    useCurrent(step)

    useEffect(() => {
        celebrationTime(3)

        setTimeout(() => {
            router.push("/handheld")
        }, 60000)

    }, [])


    return(
        <Grid>
            <GridColumn start={2} end={10} className={Style.col}>
                <Header>
                    Cheers! You're sorted.&nbsp; 🎉
                </Header>

                <aside className={Style.row}>
                    <Card theme="opaque" className={clsx(Style.touchCard, utils.me_3)}>
                        <Link className={Style.cardLink}  href={{ href: "handheld", query: { goto: 5, current: 4 }}}>
                            <svg id="icon-verified_user" viewBox="0 0 24 24"  className={Style.cardIcon}>
                                <path d="M9.984 17.016l8.016-8.016-1.406-1.406-6.609 6.563-2.578-2.578-1.406 1.406zM12 0.984l9 4.031v6c0 5.531-3.844 10.734-9 12-5.156-1.266-9-6.469-9-12v-6z"></path>
                            </svg>

                            <h2 className={Style.cardHeading}>
                                Want a FREE membership?
                            </h2>
                        </Link>
                    </Card>

                    <Card theme="opaque" className={clsx(Style.touchCard, utils.ms_3)}>
                        <Link className={Style.cardLink}  href={{ href: "handheld", query: { goto: 1, current: 4 }}}>
                            <svg id="icon-cancel" viewBox="0 0 24 24"  className={Style.cardIcon}>
                                <path d="M17.016 15.609l-3.609-3.609 3.609-3.609-1.406-1.406-3.609 3.609-3.609-3.609-1.406 1.406 3.609 3.609-3.609 3.609 1.406 1.406 3.609-3.609 3.609 3.609zM12 2.016c5.531 0 9.984 4.453 9.984 9.984s-4.453 9.984-9.984 9.984-9.984-4.453-9.984-9.984 4.453-9.984 9.984-9.984z"></path>
                            </svg>
                            
                            <h2 className={Style.cardHeading}>
                                Not today. Thanks!
                            </h2>
                        </Link>
                    </Card>
                </aside>

                <p className={clsx(Style.text, utils.text_center)}> 
                    *GRIT Hub Members can speed up their sign-in by taping their member card or their mobile phone using our app.
                </p>
            </GridColumn>
        </Grid>
    )
}


export default Confirmation;