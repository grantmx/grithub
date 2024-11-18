import Script from 'next/script';
import React from 'react';

export default function OrganizationSchema(){
    const OrgData = () => {
        return `
            {
                "@context": "https://schema.org",
                "@type": "Organization",
                "url": "https://grithub.org.za",
                "legalName": "Garden Route Innovation and Technology Hub, NPC",
                "name": "GRIT Hub",
                "openingHours": "Mo-Fr 08:00-17:00",
                "description": "Your future starts here! Garden Route Innovation and Technology located in George, Western Cape Lab is here to incubate innovation and entrepreneurship in the digital economy",
                "address": {
                    "@type": "PostalAddress",
                    "streetAddress": "Office Suite #2, York Street Blvd. Shopping Center",
                    "addressLocality": "George",
                    "addressRegion": "Western Cape",
                    "postalCode": "6529",
                    "addressCountry": "ZA"
                },
                "contactPoint": {
                    "@type": "ContactPoint",
                    "telephone": "+27-063-070-5752",
                    "contactType": "customer service",
                    "email": "info(at)grithub.org.za"
                },
                "sameAs": [
                    "https://www.facebook.com/grithub",
                    "https://twitter.com/grithub",
                    "https://www.linkedin.com/company/grithub",
                    "https://www.instagram
                ]
            }`
    }


    return (
        <Script 
            type="application/ld+json" 
            id="organizationSchema"
            dangerouslySetInnerHTML={OrgData()}
            key="item-jsonld-org"
        />        
    )
}
