"use client"

import PropTypes from 'prop-types';
import clsx from 'clsx';
import Link from 'next/link';

import Style from './Button.module.scss';
import utils from 'ui/styles/globals/utils.module.scss';


function Button({ 
    className, 
    type, 
    size, 
    variant, 
    color, 
    isRound,
    name,
    isDisabled,
    children,
    href = "",
    noAnimate,
    icon,
    autoHeight,
    title,
    ...newProps
 }){

    const buttonStyle = clsx(
        className,
        Style.button,
        Style.block,
        noAnimate && Style.noAnimate,
        color === "transparent" ?  Style[`color__${color?.class ?? color}`] : variant === "outline" ? "" : utils[`bg_${color?.class ?? color}`],                            
        (variant && color) ? Style[`color__${color?.class ?? color}-${variant}`] : variant === "outline" && Style[`color__dark-outline`],
        size && Style[`size__${size}`],
        icon && Style[`size__icon`],
        isRound && Style.round,
        autoHeight && Style.autoHeight,
        color === "white" && Style.color__white
    )


    // Nextjs Link preload button
    function LinkButton(){
        return (
            <Link 
                href={href ? href : "#" }
                aria-label={name}
                className={buttonStyle}
                disabled={isDisabled}
                {...{ title }}
                {...newProps}
            >
                {children}
            </Link>
        );
    }


    // non link functional button
    function StandardButton(){
        return(
            <button 
                aria-label={name}
                type={type} 
                disabled={isDisabled}
                className={buttonStyle}
                {...{ title, name }}
                {...newProps}
            >
                {children}
            </button>
        )
    }


    // if you just need a fake button with no functionally
    function PsedoButton(){
        return(
            <div 
                role="button"
                aria-label={name}
                disabled={isDisabled}
                className={buttonStyle} 
                {...{ title, name }}
                {...newProps}
            >
                {children}
            </div>
        )
    }



    function getType(){
        switch(type){
            case "link": return LinkButton();
            case "psedo": return PsedoButton();
            default: return StandardButton()
        }
    }


    return (
        <>
            {getType()}
        </>
    )
}


Button.propTypes = {
    color: PropTypes.oneOfType([ PropTypes.string, PropTypes.object ]),
    size: PropTypes.oneOf(["xs", "sm", "md", "lg", "xl", "xxl", "icon", "full"]),
    isRound: PropTypes.bool,
    isDisabled: PropTypes.bool,
    variant: PropTypes.oneOf(["outline", "link"]),
    href: PropTypes.string,
    type: PropTypes.oneOf(["link", "button", "submit", "reset", "psedo"]),
    title: PropTypes.string,
    icon: PropTypes.bool,
    name: PropTypes.string,
    noAnimate: PropTypes.bool,
    autoHeight: PropTypes.bool,
    className: PropTypes.string
};


export default Button;