import Style from "./styles/Handheld.module.scss"
import utils from "ui/styles/globals/utils.module.scss"

import Grid from "ui/components/layout/Grid";
import GridColumn from "ui/components/layout/GridColumn";
import { useEffect } from "react";
import { celebrationTime } from "ui/lib/celebrationTime";
import useCurrent from "./hooks/useCurrent";
import Header from "./Header";
import { useRouter } from "next/navigation";


function MemberConfirmation({ step }){
    const router = useRouter()

    useCurrent(step)

    useEffect(() => {
        celebrationTime(3)

        setTimeout(() => {
            router.push("/handheld")
        }, 5000)

    }, [])


    return(
        <Grid>
            <GridColumn start={2} end={10} className={Style.col}>
                <Header>
                    Cheers! You're sorted.&nbsp; 🎉
                </Header>

                <aside className={Style.row}>
                    
                </aside>
            </GridColumn>
        </Grid>
    )
}


export default MemberConfirmation;