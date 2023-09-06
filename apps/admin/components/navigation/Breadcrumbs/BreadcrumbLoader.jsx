import Skeleton from 'components/feedback/Skeleton';
import Grid from 'components/layout/Grid';
import GridColumn from 'components/layout/GridColumn';
import clsx from "clsx";

import utils from 'styles/globals/utils.module.scss';

function BreadcrumbLoader({ gridStart = 2, gridEnd = 10 }){
    return(
        <Grid>
            <GridColumn start={gridStart} end={gridEnd} className={clsx(utils.d_flex, utils.flex_row)}>
                <Skeleton width={"10%"} height={16} className={utils.me_2} />
                <Skeleton width={"25%"} height={16} className={utils.me_2} />
                <Skeleton width={"45%"} height={16} />
            </GridColumn>
        </Grid>
    )
}


export default BreadcrumbLoader;