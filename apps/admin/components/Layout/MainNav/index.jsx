import logo from 'public/assets/grithub-logo-horz-white-red.svg'
import mobileLogo from 'public/assets/grithub-circle-logo.svg'
import Style from './MainNav.module.scss'

import Link from "next/link";
import { nav } from "lib/navigation";
import React, { useContext, useEffect } from "react";
import { useRouter } from "next/router";
import { GlobalContext } from "contexts/GlobalContext";
import MainLink from './MainLink';
import Divider from 'components/display/Divider';


function MainNav(){
    const [ global, dispatch ] = useContext(GlobalContext)
    const router = useRouter()
    

    useEffect(() => {
        const path = router.asPath.split("/");
        const dataPath = nav?.[path[1]]?.children?.[path[2]]
       
        dispatch({
            type: "setSecondaryNav",
            data: (dataPath && Object.hasOwn(dataPath, "secondary")) ? { ...dataPath.secondary } : null
        })

  
        if( dataPath && Object.hasOwn(dataPath, "secondary") ){
            (Object.values(dataPath.secondary)).forEach((item) => {
                if( router.pathname === item.href ){
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
        }
        

    }, [ router.asPath ])



    return(
        <nav className={Style.block}>
            <Link href="/" className={Style.logoLink}>
                <picture className={Style.logo}>
                    <source srcSet={mobileLogo.src} media="(max-width: 1080px)" />
                    <img src={logo.src} alt="GRIT Hub" />
                </picture>
            </Link>


            {/* 
                TO DO 
                - add shortcut links to recently visited pages
                - save shortcut links to users localstorage and retrieve
                - allow reorder?
            */}


            {Object.values(nav).map(item => {
                if( item.name === "Overview" ){
                    return(
                        <MainLink 
                            key={item.name}
                            {...{ ...nav.overview, path: router.asPath }} 
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
                                    {...{ ...kid, path: router.asPath }} 
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