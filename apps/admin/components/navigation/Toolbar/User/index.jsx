"use client"

import Image from 'next/image';
import { useState } from 'react';
import { usePopper } from 'react-popper';
import Style from "./User.module.scss"
import clsx from 'clsx';
import Divider from 'components/display/Divider';

import avatar from "public/assets/Lion-O.jpg"
import { popperSettings } from '../Toolbar.helpers';


function User(){
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
           
            <Image
                src={avatar}
                width={30}
                height={30}
                alt="Your Avatar"
                quality={100}
            />
            
            <div 
                ref={setPopperElement} 
                style={styles.popper} 
                {...attributes.popper}
                className={clsx(Style.popper, show && Style.show )}
            >
                <header>
                    <figure className={Style.credentials}>
                        <Image
                            src={avatar}
                            width={75}
                            height={75}
                            alt="Your Avatar"
                        />

                        <figcaption className={Style.title}>
                            <h6 className={Style.name}>
                                Marshall Grant
                            </h6>

                            <cite className={Style.position}>
                                Chief Geek
                            </cite>
                        </figcaption>
                    </figure>

                    <Divider />

                    <nav className={Style.subNav}>
                        <a href="" className={Style.navItem}>
                            My Account
                        </a>

                        <a href="" className={Style.navItem}>
                            Settings
                        </a>
                    </nav>


                    <Divider />

                    <nav className={Style.subNav}>
                        <a href="" className={Style.navItem}>
                            Sign Out
                        </a>
                    </nav>
                </header>


            </div>
        </li>
    )
}


export default User;