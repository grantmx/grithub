"use client"

import { useState } from 'react';
import { usePopper } from 'react-popper';
import Style from "./Notification.module.scss"
import clsx from 'clsx';
import Badge from 'components/display/Badge';
import { popperSettings } from '../Toolbar.helpers';


function Notification(){
    const [ referenceElement, setReferenceElement ] = useState(null);
    const [ popperElement, setPopperElement ] = useState(null);
    const [ show, setShown ] = useState(false)

    const { styles, attributes } = usePopper(referenceElement, popperElement, popperSettings);


    return(
        <li
            className={Style.block}
            onMouseEnter={() => setShown(true)}
            onMouseLeave={() => setShown(false)}
            ref={setReferenceElement}
        >
           
           <div className={Style.iconBlock}>
                <svg id="icon-notifications" viewBox="0 0 24 24" width={30} height={30} className={Style.icon}>
                    <path d="M18 15.984l2.016 2.016v0.984h-16.031v-0.984l2.016-2.016v-4.969c0-3.094 1.641-5.625 4.5-6.328v-0.703c0-0.844 0.656-1.5 1.5-1.5s1.5 0.656 1.5 1.5v0.703c2.859 0.703 4.5 3.281 4.5 6.328v4.969zM12 21.984c-1.125 0-2.016-0.891-2.016-1.969h4.031c0 1.078-0.938 1.969-2.016 1.969z"></path>
                </svg>
                
                <Badge content={1} isInline className={Style.count} />
            </div>


            <div 
                ref={setPopperElement} 
                style={styles.popper} 
                {...attributes.popper}
                className={clsx(Style.popper, show && Style.show )}
            >
                    

            </div>
        </li>
    )
}


export default Notification;