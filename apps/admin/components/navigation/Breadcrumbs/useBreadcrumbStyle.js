import { useRouter } from "next/router";
import { useEffect, useState } from "react";


export default function useBreadcrumbStyle({ urlPath }){
    const router = useRouter()
    const [ isShown, setShouldShow ] = useState(true);
    const [ isLeft, setLeft ] = useState(false);


    useEffect(() => {
        setShouldShow(true)
        setLeft(false)

        if(
            router.pathname === "/" || 
            router.pathname.includes("/account/") || 
            router.pathname === "/[slug]" && !urlPath || 
            router.pathname === "/p/[slug]" && !urlPath || 
            router.pathname === "/guides" ||
            router.pathname === "/404" ||
            router.pathname === "/outdoor-furniture" ||
            router.pathname === "/grills-outdoor-kitchens" ||
            router.pathname === "/maintenance-care" ||
            router.pathname === "/outdoor-decor" ||
            router.pathname === "/featured-offers" ||
            router.pathname === "/shop-all-brands" ||
            router.pathname === "/outdoor-entertainment" ||
            router.pathname === "/outdoor-furniture" ||
            router.pathname === "/outdoor-heating" ||
            router.pathname === "/patio-umbrellas-accessories" ||
            router.pathname === "/accessories" ||
            router.pathname === "/planters" ||
            router.pathname === "/cart" ||
            router.pathname.includes("/help") || 
            router.pathname.includes("/blog")
        ){
            setShouldShow(false)
        }


        if( 
            router.pathname === "/blog/[...slug]"
        ){
            setLeft(true)
        }

    }, [router, urlPath])


    return{
        isShown,
        isLeft
    }
}