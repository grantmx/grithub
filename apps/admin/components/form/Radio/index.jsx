import clsx from 'clsx';
import generateID from 'lib/Utils/generateID';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';


import Style from './Radio.module.scss';

const Radio = React.forwardRef(({ 
    children, 
    className, 
    disabled, 
    name, 
    value, 
    required, 
    isSelected, 
    position, 
    label, 
    id, 
    onChange 
}, ref) => {

    const fakeId = generateID();
    const [ newValue, setValue ] = useState()

    const inputChange = () => {
        onChange(ref);
    }


    useEffect(() => {
        if( value ){
            setValue(value)
        }

    }, [value])


    return(
        <div className={clsx(Style.block, className, disabled && Style.disabled)}>
            <input 
                ref={ref}
                type="radio"
                name={name}
                value={newValue}
                onChange={inputChange}
                required={required}
                disabled={disabled}
                checked={isSelected}
                className={clsx(Style.control, position && Style[`control_${position}}`])}
                id={id ? id : fakeId}
            />
            
            <label htmlFor={id ? id : fakeId} className={clsx(Style.label)}>
                {children ? children : label}
            </label>
        </div>
    )
})

Radio.displayName = "Radio";

Radio.propTypes = {
    label: PropTypes.string,
    id: PropTypes.oneOfType([ 
        PropTypes.number, 
        PropTypes.string 
    ]),
    name: PropTypes.string.isRequired,
    value: PropTypes.any,
    onChange: PropTypes.func,
    required: PropTypes.bool,
    disabled: PropTypes.bool,
    position: PropTypes.string,
    isSelected: PropTypes.bool
}


export default Radio;