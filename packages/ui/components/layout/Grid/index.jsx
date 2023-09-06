import React from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import style from './Grid.module.scss';

const Grid = React.forwardRef(({ 
    xl, lg, md, sm, xs, 
    role, 
    className, 
    children, 
    gap = 0, 
    alignLeft,
    id,
    ...other 
}, ref ) => {

    const   grid_xl = xl === void 0 ? false : style[`span_xl_${xl}`],
            grid_lg = lg === void 0 ? false : style[`span_lg_${lg}`],
            grid_md = md === void 0 ? false : style[`span_md_${md}`],
            grid_sm = sm === void 0 ? false : style[`span_sm_${sm}`],
            grid_xs = xs === void 0 ? false : style[`span_xs_${xs}`],
            grid_gap = gap === void 0 ? false : {gridGap: gap};

    const GridStyle = {
        columnGap: gap,
    }

    return(
        <div 
            {...{ id, ...other }}
            ref={ref}
            id={id}
            className={clsx(
                style.container, 
                grid_xl, grid_lg, grid_md, grid_sm, grid_xs,
                alignLeft && style.alignLeft,
                className
            )} 
            style={GridStyle} 
            role="grid"
        >
            {children}
        </div>
    )
})


Grid.displayName = 'Grid';


Grid.propTypes = {
    xl: PropTypes.number,
    lg: PropTypes.number,
    md: PropTypes.number,
    sm: PropTypes.number,
    xs: PropTypes.number,
    gap: PropTypes.number,
    role: PropTypes.string,
    children: PropTypes.any,
    alignLeft: PropTypes.bool
};




export default Grid;