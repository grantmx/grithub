import clsx from 'clsx';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { animated, useSpring, to } from 'react-spring'

import Style from './Switch.module.scss';

const Switch = React.forwardRef(({
    className,
    disabled,
    name,
    value,
    required,
    label,
    labelClass,
    onChange,
    onColor,
    isToggled,
    id

}, ref) => {

    const [isOn, setOn] = useState(isToggled)

    const toggleSwitch = (e) => {
        setOn(!isOn);
        onChange(e);
    }

    useEffect(() => {
        setOn(isToggled);

    }, [isToggled])



    const animate = useSpring({
        transform: isOn ? "translate(55%, 0)" : "translate(-17%, 0)"
    })

    const animateBack = useSpring({
        backgroundColor: isOn ? (onColor ? onColor : "#dfe9ef") : "#2E303B", 
    })


    return (
        <label 
            className={clsx(Style.block, className, disabled && Style.disabled)} 
            role="switch" 
            aria-checked={isOn}
        >
            <div className={Style.controlGroup} aria-disabled={disabled !== undefined}>
                <animated.div 
                    className={Style.handelContainer} 
                    style={animate}
                >
                    <div className={clsx(Style.handel)} />
                    
                    <input
                        ref={ref}
                        className={clsx(Style.control)}
                        type="checkbox"
                        name={name}
                        onChange={toggleSwitch}
                        value={value}
                        checked={isOn}
                        required={required}
                        disabled={disabled}
                    />
                </animated.div>

                <animated.div className={Style.track} style={animateBack} />
            </div>

            {label && (
                <div className={clsx(Style.label, labelClass && labelClass)}>
                    {label}
                </div>
            )}
        </label>
    )
})

Switch.displayName = "Switch";

Switch.propTypes = {
    label: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    value: PropTypes.string || PropTypes.bool,
    disabled: PropTypes.bool,
    name: PropTypes.string,
    required: PropTypes.bool,
    className: PropTypes.string,
    labelClass: PropTypes.string
};


export default Switch;