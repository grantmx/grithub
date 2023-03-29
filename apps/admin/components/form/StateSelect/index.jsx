import PropTypes from 'prop-types';
import clsx from 'clsx';
import React, { useEffect, useState } from 'react';
import { states } from 'lib/Constants';

import Style from './StateSelect.module.scss';


const StateSelect = React.forwardRef(({ 
    error, 
    label, 
    required, 
    disabled, 
    value, 
    name,
    helpText, 
    onChange 
}, ref) => {
    const [ newValue, setValue ] = useState(value)
    const inputChange = (ref) => { onChange(ref); }


    useEffect(() => {
        if( value ){ setValue(value) }

    }, [value])


    return(
        <div className={clsx(Style.block)}>
            <label className={clsx(Style.label, error && Style.error__label)}>
                {label}
            </label>

            <div className={Style.controlGroup}>
                <select
                    ref={ref}
                    className={clsx(Style.control, error && Style.error__control)} 
                    required={required}
                    disabled={disabled}
                    name={name}
                    onChange={inputChange}
                    defaultValue={newValue}
                >
                    <option value="">--- Select ---</option>

                    {states.map(state => {
                        return(
                            <option value={state.name} key={state.abbreviation}>
                                {state.name}
                            </option>
                        )
                    })}
                </select>
                 
            </div>

            {helpText && 
                <small className={clsx(Style.help, error && Style.error__help)}>
                    {helpText}
                </small>
            }
        </div>
    )
})

StateSelect.displayName = "StateSelect";

StateSelect.propTypes = {
    label: PropTypes.string.isRequired,
    placeholder: PropTypes.string,
    name: PropTypes.string.isRequired,
    onChange: PropTypes.func,
    required: PropTypes.bool,
    disabled: PropTypes.bool,
    helpText: PropTypes.string,
    error: PropTypes.bool,
    value: PropTypes.any
}


export default StateSelect;