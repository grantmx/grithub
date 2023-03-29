
import PropTypes from 'prop-types';
import React from 'react';
import clsx from 'clsx';
import generateID from 'lib/Utils/generateID';
import dynamic from 'next/dynamic'

import Style from './RadioButton.module.scss';
import utils from 'styles/globals/utils.module.scss';

const IconArrowRight = dynamic(() => import('components/icons').then(module => module.IconArrowRight))
const IconLiquidPropane = dynamic(() => import('components/icons').then(module => module.IconLiquidPropane))
const IconNaturalGas = dynamic(() => import('components/icons').then(module => module.IconNaturalGas))


const RadioButton = React.forwardRef(({ 
    color, 
    name, 
    onChange, 
    children, 
    required, 
    disabled, 
    selected, 
    value,
    id,
    className = "",
    buttonClass = "",
    label,
    ...other
}, ref) => {

    const fakeId = generateID();

    return(
        <label className={clsx(Style.block, className)} htmlFor={id ? id : fakeId}>
            <input 
                ref={ref}
                id={id ? id : fakeId}
                type="radio" 
                name={name} 
                value={value}
                required={required}
                disabled={disabled}
                checked={selected}
                title={label}
                onChange={(ref) => onChange(ref)}
                {...other}
            />

            <div className={clsx(Style.button, buttonClass, color && utils[`text_${color?.class ?? color}`], utils[`border_${color?.class ?? color}`])}>
                {[label].toString().includes("Propane") && <IconLiquidPropane width="50" height="50" fill="#000" /> }
                {[label].toString().includes("Natural Gas") && <IconNaturalGas width="50" height="50" fill="#000" /> }
                {[label].toString().includes("LP to NG") && ( 
                    <div className={Style.iconList}>
                        <IconLiquidPropane width="40" height="40" fill="#000" />
                        <IconArrowRight width="30" className={Style.arrowIcon} />
                        <IconNaturalGas width="40" height="40" fill="#000" /> 
                    </div>
                )}

                {children}
            </div>
        </label>
    )
})


RadioButton.propTypes = {
    color: PropTypes.string,
    name: PropTypes.string,
    label: PropTypes.string,
    buttons: PropTypes.array,
    onChange: PropTypes.func,
    required: PropTypes.bool,
    disabled: PropTypes.bool,
    isSelected: PropTypes.bool
};


RadioButton.displayName = "RadioButton";


export default RadioButton;