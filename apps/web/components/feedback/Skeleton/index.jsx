import clsx from 'clsx';
import PropTypes from 'prop-types';
import Style from "./Skeleton.module.scss";


function Skeleton({ 
    className, 
    variant, 
    animation, 
    color, 
    height, 
    width, 
    ...otherProps 
}){

    return(
        <div 
            role="progressbar"
            {...otherProps}
            className={clsx(
                Style.block, 
                variant && Style[variant],
                className,
                animation === false ? Style.noAnimation : Style[animation === undefined ? "pulse" : animation],
            )} 
            style={{width: width, height: height}}
        />
    )
}


Skeleton.propTypes = {
    width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    variant: PropTypes.oneOf(["circle", "rect", "text"]),
    animation: PropTypes.oneOf([false, "wave", "pulse"]),
    color: PropTypes.string
};


export default Skeleton;