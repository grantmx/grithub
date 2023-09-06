import React from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import style from './GridColumn.module.scss';


const GridColumn = React.forwardRef(({  
    isRow,
    className,
    noWrap,
    children,
    start,
    end,
    rowEnd,
    rowStart,
    ...other
}, ref ) => {

    const   col_xls = other["xl-start"] === void 0 ? false : style[`gridStart_xl_${other["xl-start"]}`],
            col_xle = other["xl-end"] === void 0 ? false : style[`gridEnd_xl_${other["xl-end"]}`],
            col_lgs = other["lg-start"] === void 0 ? false : style[`gridStart_lg_${other["lg-start"]}`],
            col_lge = other["lg-end"] === void 0 ? false : style[`gridEnd_lg_${other["lg-end"]}`],
            col_mds = other["md-start"] === void 0 ? false : style[`gridStart_md_${other["md-start"]}`],
            col_mde = other["md-end"] === void 0 ? false : style[`gridEnd_md_${other["md-end"]}`],
            col_sms = other["sm-start"] === void 0 ? false : style[`gridStart_sm_${other["sm-start"]}`],
            col_sme = other["sm-end"] === void 0 ? false : style[`gridEnd_sm_${other["sm-end"]}`],
            col_xss = other["xs-start"] === void 0 ? false : style[`gridStart_xs_${other["xs-start"]}`],
            col_xse = other["xs-end"] === void 0 ? false : style[`gridEnd_xs_${other["xs-end"]}`],
            col_GridColumnStyle = {
                gridColumnStart: start, 
                gridColumnEnd: end, 
                gridRowEnd: rowEnd,
                gridRowStart: rowStart
            };

    return(
        <div 
            ref={ref}
            {...other}
            className={clsx(
                col_xls, col_xle, col_lgs, col_lge, col_mds, col_mde, col_sms, col_sme, col_xss, col_xse,
                style.block, 
                isRow && style.row, 
                className,
                noWrap && style.noWrap
            )} 
            style={col_GridColumnStyle}
            role="row"
        >
            {children}
        </div>
    )
})

GridColumn.displayName = 'GridColumn';


GridColumn.propTypes = {
    start: PropTypes.number,
    end: PropTypes.number,
    isRow: PropTypes.bool,
    rowStart: PropTypes.number,
    rowEnd: PropTypes.number,
    noWrap: PropTypes.bool,
    other: PropTypes.string
};



export default GridColumn;