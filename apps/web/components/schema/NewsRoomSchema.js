"use client"
import Script from "next/script"

export default function NewsRoomSchema({ path, title = "", metaDescription = "", image, author="", postDate="", dateUpdated="" }){
    // write regex to remove html tags from metaDescription
    const newMetaDescription = metaDescription.replace(/(<([^>]+)>)/gi, "")
    
    
    const data = () => { 
        return{
            __html: `{
                "@context": "https://schema.org/",
                "@type": "BlogPosting",
                "mainEntityOfPage": {
                    "@type": "WebPage",
                    "@id": "${path}"
                },
                "headline": "${title}",
                "description": "${newMetaDescription}",
                "image": {
                    "@type": "ImageObject",
                    "url": "${image}"
                },
                "author": {
                    "@type": "Person",
                    "name": "${author}"
                },
                "publisher": {
                    "@type": "Organization",
                    "name": "Garden Route Innovation & Technology Hub",
                    "logo": {
                        "@type": "ImageObject",
                        "url": "https://grithub.org.za/assets/grithub-logo-horz.svg"
                    }
                },
                "datePublished": "${postDate}",
                "dateModified": "${dateUpdated}"
            }`
        }
    }


    return(
        <Script 
            type="application/ld+json" 
            id="newsroomSchema"
            dangerouslySetInnerHTML={data()}
            key="item-jsonld-blog"
        />
    )
}