"use client";

import Style from './MainNav.module.scss'

import { nav } from "lib/navigation";
import React, { useContext, useEffect } from "react";
import { usePathname } from "next/navigation";
import { GlobalContext } from "contexts/GlobalContext";
import MainLink from './MainLink';
import Divider from 'components/display/Divider';
import Logo from '../Logo';


function MainNav(){
    const [ global, dispatch ] = useContext(GlobalContext)
    const pathname = usePathname()
    

    useEffect(() => {
        const path = pathname.split("/");
        const dataPath = nav?.[path[1]]?.children?.[path[2]]
       
        dispatch({
            type: "setSecondaryNav",
            data: (dataPath && Object.hasOwn(dataPath, "secondary")) ? { ...dataPath.secondary } : null
        })


        if( dataPath && Object.hasOwn(dataPath, "secondary") ){
            (Object.values(dataPath.secondary)).forEach((item) => {
                if( pathname === item.href ){
                    dispatch({
                        type: "updateGlobalHeading",
                        data: item.heading
                    })
                }
            })

        }else if (dataPath){
            dispatch({
                type: "updateGlobalHeading",
                data: dataPath.heading
            })

        }else{
            dispatch({
                type: "updateGlobalHeading",
                data: path[1]
            })
        }
        

    }, [ pathname ])



    return(
        <nav className={Style.block}>
            {/* <Logo /> */}
            {/* <Divider className={Style.logoSpacer} /> */}

            {/* 
                TO DO 
                - add shortcut links to recently visited pages
                - save shortcut links to users localstorage and retrieve
                - allow reorder?
            */}


            {Object.values(nav).map(item => {
                if( item.name === "Dashboard" ){
                    return(
                        <MainLink 
                            key={item.name}
                            {...{ ...nav.overview, path: pathname }} 
                        />
                    )
                }


                return(
                    <React.Fragment key={item?.heading}>
                        <h2 className={Style.heading}>
                            {item?.heading}
                        </h2>

                        {item?.children && Object.values(item?.children).map(kid => {
                            return(
                                <MainLink 
                                    key={kid.name} 
                                    {...{ ...kid, path: pathname }} 
                                />
                            )
                        })}

                        <Divider className={Style.spacer} />
                    </React.Fragment>
                )
            })}
        </nav>
    )
}


export default MainNav;