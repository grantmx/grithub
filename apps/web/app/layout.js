import 'bootstrap/dist/css/bootstrap.css'
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/react"
import GoogleEventTracker from '../thirdparty/google/GoogleEventTracker'
import OrganizationSchema from '/components/schema/Organization';


export const metadata = {
	title: {
		template: '%s : Garden Route Innovation and Technology Hub',
		default: 'Garden Route Innovation and Technology Hub',
        verification: {
            google: "LNiA23tiS3vejUsuJnv3kS4i-T-w6kJyni9MleyXccQ",
        }
	},
    description: "Your future starts here! Garden Route Innovation and Technology located in George, Western Cape Lab is here to incubate innovation and entrepreneurship in the digital economy",	
}


function RootLayout({ children }){
    return(
        <html lang="en">            
            <body>
                {children}

                <OrganizationSchema />
                <GoogleEventTracker />
                <SpeedInsights/>
                <Analytics />

            </body>
        </html>
    )
}

export default RootLayout;