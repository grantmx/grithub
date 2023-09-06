/* eslint-disable react-hooks/exhaustive-deps */
import PropTypes from 'prop-types';
import clsx from 'clsx';
import React, { useEffect, useRef, useState } from 'react';
// import useDebounce from 'react-use/lib/useDebounce';
import Input from '../Input';

import Style from './Select.module.scss';




const Select = React.forwardRef(({ 
    error, 
    label, 
    required, 
    disabled, 
    value, 
    children, 
    helpText, 
    className,
    name,
    color,
    readOnly,
    valuesMap = [],
    onKeyUp = () => null,
    onInput = () => null,
    onChange = () => null,
    watchActiveState = () => null

}, ref) => {
    const [ newValue, setValue ] = useState(null)
    const inputRef = useRef()
    const [ isActive, setIsActive ] = useState(false)


    useEffect(() => {
        watchActiveState(isActive)
        
    }, [ isActive ])
    

    
    const triggerEvents = (event) => {
        const value = inputRef.current.value;

        if( onChange ){ onChange(value, inputRef.current, event); }
        if( onKeyUp ){ onKeyUp(value, inputRef.current, event); }
        if( onInput ){ onInput(value, inputRef.current, event); }
    }

    
    const inputChange = (e) => {
        if(inputRef.current){
            triggerEvents(e)
        }
        setValue(() => ref?.current?.value ?? e?.target?.value)
        setIsActive(() => false)
    }


    useEffect(() => {
        if( value ){
            setValue(value)
        }

    }, [value])




    return(
        <div className={clsx(Style.block, className, isActive && Style.activeBlock, color && Style[`block__${color?.class ?? color}`])}>
            <div className={clsx(Style.controlGroup)}>
                <Input 
                    {...{ required, disabled, readOnly, name, label, color, valuesMap }}
                    value={newValue}
                    ref={ref}
                    onChange={inputChange}
                    onFocus={() => setIsActive(true)}
                    onBlur={() => setTimeout(() => { setIsActive(false) }, 200)}
                />
                
                <ul 
                    className={clsx(Style.menu, isActive && Style.active)}
                    tabIndex="-1" 
                    role="listbox"
                >
                    {children}
                </ul>
            </div>

            {helpText &&
                <small className={clsx(Style.help, error && Style.error__help)}>
                    {helpText}
                </small>
            }
        </div>
    )
})

Select.displayName = "Select";

Select.propTypes = {
    label: PropTypes.string.isRequired,
    placeholder: PropTypes.string,
    name: PropTypes.string.isRequired,
    onChange: PropTypes.func,
    required: PropTypes.bool,
    disabled: PropTypes.bool,
    helpText: PropTypes.string,
    error: PropTypes.bool,
    value: PropTypes.any,
    children: PropTypes.any.isRequired,
    className: PropTypes.string
}


export default Select;