import React from 'react';
import { OrganizationJsonLd } from 'next-seo';

export default function OrganizationSchema(){
    return(
        <OrganizationJsonLd
            type="Corporation"
            id="https://grithub.org.za"
            legalName="Garden Route Innovation and Technology Hub, NPC"
            name="GRIT Hub"
            url="https://grithub.org.za"
            address={{
                streetAddress: 'York Street Blvd. Shopping Center',
                streetAddress: 'Office Suite #2',
                addressLocality: 'George',
                addressRegion: 'WC',
                postalCode: '6529',
                addressCountry: 'ZA',
            }}
            contactPoint={[
                {
                    telephone: '+27-063-070-5752',
                    contactType: 'customer service',
                    email: 'workforce@grithub.org.za',
                    areaServed: 'ZA',
                    availableLanguage: ['English', 'Afrikaans'],
                }
            ]}
        />
    )
}
