import React from 'react';
import clsx from 'clsx';
import PropTypes from 'prop-types';

import Style from './Divider.module.scss';


const Divider = React.forwardRef(({ 
    isSpacer, 
    className, 
    flex, 
    orientation, 
    color, 
    capped, 
    height = 1,
    width = "100%",
    ...other 
}, ref) => {
    
    return(
        <>
            {isSpacer ? 
                <b 
                    {...other}
                    role="separator" 
                    className={clsx(
                        Style.spacer,
                        className, 
                        flex && Style.flex
                    )} 
                    ref={ref}
                />
            :
                <hr 
                    {...other}
                    ref={ref}
                    role="separator"
                    size={height}
                    style={{ height: `${height}`, width: `${width}`}}
                    className={clsx(
                        Style.block, 
                        className, 
                        orientation && Style[orientation],
                        flex && Style.flex,
                        capped && Style.capped
                    )}
                />
            }
        </>
    )
});


Divider.displayName = 'Divider';


Divider.propTypes = {
    orientation: PropTypes.oneOf(["vertical", "horizontal"]),
    flex: PropTypes.bool,
    color: PropTypes.oneOfType([ PropTypes.string, PropTypes.object ]),
    capped: PropTypes.bool,
    isSpacer: PropTypes.bool,
    height: PropTypes.oneOfType([ PropTypes.number, PropTypes.string ]),
    width: PropTypes.oneOfType([ PropTypes.number, PropTypes.string ])
}


export default Divider;