import clsx from "clsx";
import { GlobalContext } from "contexts/GlobalContext";
import Link from "next/link";
import { useRouter } from "next/router";
import { useContext, useEffect } from "react";
import Style from './SecondaryNav.module.scss'



function SecondaryNav(){
    const [ global, _ ] = useContext(GlobalContext)
    const router = useRouter()

    return(
        <>
            {global?.secondaryNav && (
                <nav className={Style.block}>
                    {Object.values(global.secondaryNav).map(item => {
                        return(
                            <Link 
                                key={item.name}
                                href={item.href} 
                                className={clsx(Style.link, router.pathname === item.href && Style.active)}
                            >
                            {item.name}
                            </Link>
                        )
                    })}
                </nav>
            )}
        </>
    )
}

export default SecondaryNav;