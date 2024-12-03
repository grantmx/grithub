"use client"

import * as gtag from "../gtag"
import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Script from 'next/script'



export default function GoogleEventTracker(){
    const pathname = usePathname()
    const searchParams = useSearchParams()

	useEffect(() => {
            const url = `${pathname}?${searchParams}`
            console.log(url)
			gtag.pageview(url)

	}, [
        pathname, 
        searchParams    
    ])


    return(
        <>
            <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-PRVBFD65" height="0" width="0" style={{display: "none", visibility: "hidden"}}></iframe></noscript>

            <Script
                strategy="afterInteractive"
                src={`https://www.googletagmanager.com/gtag/js?id=${gtag.GA_TRACKING_ID}`}
            />


            {/* Google */}
            <Script
                id="gtag-init"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                    __html: `
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());

                        gtag('config', '${gtag.GA_TRACKING_ID}', {
                            page_path: window.location.pathname,
                        });
                        gtag('config', 'AW-11196953099');
                    `
                }}
            />

            <Script id="google_tag_manager" strategy='afterInteractive'>
                {`
                    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                    })(window,document,'script','dataLayer','GTM-PRVBFD65');
                `}
            </Script>
        </>
    )

}