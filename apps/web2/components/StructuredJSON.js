/**
 * Structured JSON Module
 */


export const StructuredJSON = () => {
    
    const dataObject = {
        "@context": "http://schema.org",
        "@type": "Organization",
        "name": "Garden Route Innovation and Technology Hub",
        "description": "We are a Non-Profit Company with a mission to be a catalyst for providing training, programming and mentoring services in the Western Cape's Garden Route/Klien Karoo district business ecosystem.",
        "image": "https://grithub.org.za/assets/hero.jpg",
        "logo": "https://grithub.org.za/_next/image?url=%2Fassets%2Fgrithub-logo-horz-dark.svg&w=828&q=75",
        "url": "https://grithub.org.za/",
        "telephone": "+270630705752",
        "address": {
            "@type": "PostalAddress",
            "streetAddress": "24 MEADE ST, GEORGE SOUTH",
            "addressLocality": "GEORGE",
            "postalCode": "6529",
            "addressCountry": "South Africa"
        }
    }


    return JSON.stringify(dataObject)
}
