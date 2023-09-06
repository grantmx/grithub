import React from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import Link from 'next/link';

import Style from './Alert.module.scss';
import utils from 'styles/globals/utils.module.scss';


function Alert({ color, className, href, title, children, center, noMargin }){
    
    return (
        <div className={clsx(
                Style.block, 
                utils[`bg_${color?.class ?? color}`],
                center && `${utils.justify_content_center} ${utils.text_center}`,    
                noMargin && utils.m_0,            
                className
            )} 
            role="alert"
        >
            {href ? 
                <Link href={href} title={title} className={Style.link}>
                    {children}
                </Link>
            :
                <>
                    {children}
                </>
            }
        </div>
    );
}


Alert.propTypes = {
    center: PropTypes.bool,
    color: PropTypes.string,
    noMargin: PropTypes.bool,
    href: PropTypes.string,
    title: PropTypes.string,
    className: PropTypes.string,
    children: PropTypes.any
};


export default Alert;