"use client"

/* eslint-disable react-hooks/exhaustive-deps */
import clsx from 'clsx';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

import Style from './Badge.module.scss';
import utils from 'styles/globals/utils.module.scss';


function Badge({
    content,
    max,
    showZero,
    color,
    children,
    variant,
    type,
    className = "",
    isInline = false
}){
    const [ badgeContent, setContent ] = useState(content);

    useEffect(() => {
        if( Number.isInteger(content) && content > max ){
            setContent(`+${max}`)

        }else if( showZero && !content ){
            setContent(0)
            
        }else{
            setContent(content)
        }

    }, [ content ])


    return(
        <>
            { variant === "square" ? 
                <div className={clsx(
                        Style.block, 
                        utils[`bg_${color?.class ?? color}`], 
                        Style.square,
                        isInline && Style.inline,
                        className,
                        type === "tag" && Style.tag
                    )} 
                    role="presentation"
                >
                    {children}
                </div>
            
            :

            variant === "vertical" ? 
                <div className={clsx(
                        Style.block, 
                        utils[`bg_${color?.class ?? color}`], 
                        isInline && Style.inline,
                        Style.vertical,
                        className
                    )} 
                    role="presentation"
                >
                    {children}
                </div>

            :

                <div className={clsx(
                        Style.block, 
                        utils[`bg_${color?.class ?? color}`],
                        isInline && Style.inline,
                        className                  
                    )} 
                    role="presentation"
                >
                    {children}
                    <span className={clsx(
                        Style.upper, 
                        (showZero && !content) || !content && Style.hide
                    )}>
                        {badgeContent}
                    </span>
                </div>
            }
        </>
    )
}


Badge.propTypes = {
    children: PropTypes.any,
    content: PropTypes.node,
    color: PropTypes.string,
    max: PropTypes.number,
    showZero: PropTypes.bool,
    className: PropTypes.string,
    variant: PropTypes.oneOf(["square", "vertical"])
};


export default Badge;