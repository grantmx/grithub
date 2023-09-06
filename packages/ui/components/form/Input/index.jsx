/* eslint-disable react-hooks/exhaustive-deps */
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import removeSpaces from 'ui/lib/removeSpaces';
import { IconClose, IconInputError, IconSearch } from 'ui/components/icons';

import Style from './Input.module.scss';



const Input = React.forwardRef(({
    type = "text",
    className,
    autocomplete,
    label,
    name,
    required,
    disabled,
    error = false,
    value,
    canClear,
    placeholder,
    min,
    max,
    accept,
    maxLength,
    minLength,
    readOnly,
    helpText,
    controlClass,
    unitText,
    onFocus = () => null,
    onBlur = () => null,
    onChange = () => null,
    onKeyUp = () => null,
    onInput = () => null,
    autoFocus = false,

}, ref ) => {
    
    const inputRef = useRef()
    const [ newValue, setValue ] = useState("")
    const [ inputType, setType ] = useState(type);
    const [ hasFocus, setHasFocus ] = useState(null)


    useEffect(() => {
        if( autoFocus ){ inputRef.current.focus() }
        
    }, [])


    useEffect(() => {
        if( value || value === 0 ){
            setValue(value)
            setHasFocus(true)
        }
        
    }, [value])

 

    const togglePassword = () => {
        const newType = inputType === "text" ? "password" : "text"
        setType(newType)
    }


    const triggerEvents = (event) => {
        const value = inputRef.current.value;

        if( onChange ){ onChange(value, inputRef.current, event); }
        if( onKeyUp ){ onKeyUp(value, inputRef.current, event); }
        if( onInput ){ onInput(value, inputRef.current, event); }
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

        onBlur()
    }


    const inputChange = (e) => {
        triggerEvents(e)
        setValue(ref?.current?.value ?? e?.target?.value)
        checkForValue(e)
    }


    const clearInput = () => {
        inputRef.current.value = "";

        setValue("")
        triggerEvents()
    }


    return(
        <div className={clsx(Style.block, className, hasFocus && Style.active, type === "file" && Style.file)}>
            <div className={Style.controlGroup}>
                <input 
                    ref={(node) => {
                        inputRef.current = node;

                        if (typeof ref === 'function') {
                            ref(node);

                        } else if (ref) {
                            ref.current = node;
                        }
                    }}
                    id={removeSpaces(label)}
                    autoComplete={autocomplete}
                    type={inputType}
                    name={name}
                    className={clsx(Style.control, controlClass, error && Style.error__control)} 
                    required={required}
                    placeholder={placeholder}
                    value={newValue}
                    accept={accept}
                    disabled={disabled}
                    onChange={inputChange}
                    onInput={inputChange}
                    onKeyUp={inputChange}
                    onFocus={() => {
                        onFocus()
                        setHasFocus(true)
                    }}
                    onBlur={checkForValue}
                    min={min}
                    max={max}
                    readOnly={readOnly}
                    minLength={type === "password" ? 8 : minLength}
                    maxLength={type === "password" ? 20 : maxLength}
                />

                {error && (
                    <IconInputError 
                        className={clsx(Style.errorIcon, (type !== "password" && !newValue) && Style.flushRightIcon )}
                    />
                )}


                {(canClear && hasFocus && type !== "password") && (
                    <button type='button' onClick={clearInput} className={Style.clearInput}>
                        <IconClose />
                    </button>
                )}
                

                {type === "password" && (
                    <button type="button" className={Style.togglePassword} onClick={togglePassword}>
                        {inputType === "text" ?  (
                            <svg viewBox="0 0 28 28" xmlSpace="preserve" className={Style.showHideIcon}>
                                <path d="M8.672 20.859l1.219-2.203c-1.813-1.313-2.891-3.422-2.891-5.656 0-1.234 0.328-2.453 0.953-3.516-2.438 1.25-4.469 3.219-5.953 5.516 1.625 2.516 3.922 4.625 6.672 5.859zM14.75 9c0-0.406-0.344-0.75-0.75-0.75-2.609 0-4.75 2.141-4.75 4.75 0 0.406 0.344 0.75 0.75 0.75s0.75-0.344 0.75-0.75c0-1.797 1.469-3.25 3.25-3.25 0.406 0 0.75-0.344 0.75-0.75zM20.422 6.016c0 0.031 0 0.109-0.016 0.141-3.297 5.891-6.563 11.813-9.859 17.703l-0.766 1.391c-0.094 0.156-0.266 0.25-0.438 0.25-0.281 0-1.766-0.906-2.094-1.094-0.156-0.094-0.25-0.25-0.25-0.438 0-0.25 0.531-1.094 0.688-1.359-3.031-1.375-5.578-3.719-7.375-6.531-0.203-0.313-0.313-0.688-0.313-1.078 0-0.375 0.109-0.766 0.313-1.078 3.094-4.75 7.922-7.922 13.687-7.922 0.938 0 1.891 0.094 2.812 0.266l0.844-1.516c0.094-0.156 0.25-0.25 0.438-0.25 0.281 0 1.75 0.906 2.078 1.094 0.156 0.094 0.25 0.25 0.25 0.422zM21 13c0 2.906-1.797 5.5-4.5 6.531l4.375-7.844c0.078 0.438 0.125 0.875 0.125 1.313zM28 15c0 0.406-0.109 0.734-0.313 1.078-0.484 0.797-1.094 1.563-1.703 2.266-3.063 3.516-7.281 5.656-11.984 5.656l1.156-2.063c4.547-0.391 8.406-3.156 10.844-6.937-1.156-1.797-2.641-3.375-4.406-4.594l0.984-1.75c1.937 1.297 3.891 3.25 5.109 5.266 0.203 0.344 0.313 0.672 0.313 1.078z"></path>
                            </svg>
                        ):(
                            <svg viewBox="0 0 28 28" xmlSpace="preserve" className={Style.showHideIcon}>
                                <path d="M26 15c-1.484-2.297-3.516-4.266-5.953-5.516 0.625 1.062 0.953 2.281 0.953 3.516 0 3.859-3.141 7-7 7s-7-3.141-7-7c0-1.234 0.328-2.453 0.953-3.516-2.438 1.25-4.469 3.219-5.953 5.516 2.672 4.125 6.984 7 12 7s9.328-2.875 12-7zM14.75 9c0-0.406-0.344-0.75-0.75-0.75-2.609 0-4.75 2.141-4.75 4.75 0 0.406 0.344 0.75 0.75 0.75s0.75-0.344 0.75-0.75c0-1.781 1.469-3.25 3.25-3.25 0.406 0 0.75-0.344 0.75-0.75zM28 15c0 0.391-0.125 0.75-0.313 1.078-2.875 4.734-8.141 7.922-13.687 7.922s-10.813-3.203-13.687-7.922c-0.187-0.328-0.313-0.688-0.313-1.078s0.125-0.75 0.313-1.078c2.875-4.719 8.141-7.922 13.687-7.922s10.813 3.203 13.687 7.922c0.187 0.328 0.313 0.688 0.313 1.078z"></path>
                            </svg>
                        )}
                    </button>
                )}


                {unitText && (
                    <span className={Style.postFix}>
                        {unitText}
                    </span>
                )}


                <label
                    onClick={() => inputRef.current.focus()}
                    className={clsx(Style.label, error && Style.error__label, !!unitText && Style.hasUnit)} 
                    htmlFor={removeSpaces(label)}
                >
                    {label}
                </label>

                {type === "search" && <IconSearch className={Style.searchIcon} />}

            </div>

            {helpText && 
                <p className={clsx(Style.help, error && Style.error__help)}>
                    {helpText}
                </p>
            }
        </div>
    )
})

Input.displayName = 'Input';


Input.propTypes = {
    type: PropTypes.oneOf(["text", "email", "number", "time", "url", "password", "search", "tel" ]),
    label: PropTypes.string,
    placeholder: PropTypes.string,
    name: PropTypes.string,
    controlClass: PropTypes.string,
    value: PropTypes.any,
    onChange: PropTypes.func,
    required: PropTypes.bool,
    disabled: PropTypes.bool,
    readOnly: PropTypes.bool,
    helpText: PropTypes.string,
    canClear: PropTypes.bool,
    accept: PropTypes.string,
    error: PropTypes.bool,
    min: PropTypes.number,
    max: PropTypes.number,
}




export default Input;