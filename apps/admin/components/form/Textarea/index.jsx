import PropTypes from 'prop-types';
import clsx from 'clsx';
import React, { useEffect, useRef, useState } from 'react';

import Style from './Textarea.module.scss';


const Textarea = React.forwardRef(({ 
    error, 
    label, 
    required, 
    placeholder, 
    rows, 
    name,
    children, 
    helpText, 
    disabled, 
    onChange = () => null,
    onKeyUp = () => null,
    onInput = () => null,
    readOnly,
    id,
    value = ""

}, ref) => {

    const inputRef = useRef()
    const [ newValue, setValue ] = useState()
    const [ hasFocus, setHasFocus ] = useState(false)


    const triggerEvents = () => {
        const value = inputRef.current.value;

        if( onChange ){ onChange(value, inputRef.current); }
        if( onKeyUp ){ onKeyUp(value, inputRef.current); }
        if( onInput ){ onInput(value, inputRef.current); }
    }


    function checkForValue(e){
        const hasValue = ref?.current?.value.length || e?.target?.value.length;
        const hasCurrentFocus = document.activeElement === inputRef.current;

        if( hasCurrentFocus && !hasValue ){
            setHasFocus(true)

        }else if( !hasCurrentFocus && hasValue ){
            setHasFocus(true)

        }else if( !hasCurrentFocus && !hasValue ){
            setHasFocus(false)
        }
    }

    
    const inputChange = (e) => {
        triggerEvents(e)
        setValue(ref?.current?.value ?? e?.target?.value)

        checkForValue(e)
    }


    useEffect(() => {
        if( children || value ){
            setValue(children || value)
            setHasFocus(true)
        }

    }, [children, value ])


    return(
        <div className={clsx(Style.block, hasFocus && Style.active)}>
            <label
                onClick={() => inputRef.current.focus()}
                className={clsx(Style.label, error && Style.error__label)}
            >
                {label}
            </label>

            <div className={Style.controlGroup}>
                <textarea 
                    ref={(node) => {
                        inputRef.current = node;

                        if (typeof ref === 'function') {
                            ref(node);

                        } else if (ref) {
                            ref.current = node;
                        }
                    }}
                    className={clsx(Style.control, error && Style.error__control)} 
                    required={required}
                    placeholder={placeholder}
                    disabled={disabled}
                    readOnly={readOnly}
                    name={name}
                    id={id}
                    onChange={inputChange}
                    onFocus={() => setHasFocus(true)}
                    onBlur={checkForValue}
                    rows={rows ? rows : 4}
                    value={newValue}
                >
                    {children}
                </textarea>
            </div>

            {helpText && 
                <small className={clsx(Style.help, error && Style.error__help)}>
                    {helpText}
                </small>
            }
        </div>
    )
})

Textarea.displayName = "Textarea";

Textarea.propTypes = {
    label: PropTypes.string.isRequired,
    placeholder: PropTypes.string,
    name: PropTypes.string.isRequired,
    onChange: PropTypes.func,
    onKeyUp: PropTypes.func,
    onInput: PropTypes.func,
    required: PropTypes.bool,
    disabled: PropTypes.bool,
    helpText: PropTypes.string,
    error: PropTypes.bool,
    rows: PropTypes.number
}


export default Textarea;