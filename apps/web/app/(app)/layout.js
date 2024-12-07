import 'bootstrap/dist/css/bootstrap.css'
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/react"
import GoogleEventTracker from '../../thirdparty/google/GoogleEventTracker'
import OrganizationSchema from '/components/schema/Organization';
import { Suspense } from 'react';


export const metadata = {
    metadataBase: "https://grithub.org.za",
	title: {
		template: '%s : Garden Route Innovation and Technology Hub - GRIT Hub',
		default: 'Garden Route Innovation and Technology Hub - GRIT Hub',
        verification: {
            google: "LNiA23tiS3vejUsuJnv3kS4i-T-w6kJyni9MleyXccQ",
        }
	},
    description: "Your future starts here! The Garden Route Innovation and Technology (GRIT Hub) located in George, Western Cape Lab is here to incubate innovation and entrepreneurship in the digital economy",	
}


function Layout({ children }){
    return(
        <html lang="en">     
            <head>
				<link rel="manifest" href="/manifest.json" />
				<meta name="theme-color" content="#f2f2f2" />
			</head>

            <body>
                {children}

                <OrganizationSchema />
               
                <SpeedInsights/>
                <Analytics />

                <Suspense>
                    <GoogleEventTracker />
                </Suspense>

            </body>
        </html>
    )
}

export default Layout;