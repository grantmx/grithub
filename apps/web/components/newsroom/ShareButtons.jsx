"use client"

import Style from "app/(pages)/newsroom/newsroom.module.scss";
import { toHTML } from '@portabletext/to-html'

import { 
    EmailShareButton,
    EmailIcon, 
    FacebookShareButton, 
    FacebookIcon,
    WhatsappShareButton, 
    WhatsappIcon,
    LinkedinShareButton,
    LinkedinIcon,
} from "react-share";



function ShareButtons({ title, url, body }){
    const htmlBody = toHTML(body, { components: { types: { image: null } }})
    const summary = htmlBody.slice(0, 300)

    return(
        <ul className={Style.shareList}>
            <li className={Style.shareListItem}>
                <EmailShareButton
                    {...{ title, url }} 
                    subject="Hey! 👋 Check out this article on GRIT Hub I found."
                    body={`Read this article on GRIT Hub's website: ${title}`}
                >
                    <EmailIcon size={32} round />
                </EmailShareButton>
            </li>
            <li className={Style.shareListItem}>
                <FacebookShareButton 
                    {...{ title, url }} 
                    hashtag="#grithub"
                >
                    <FacebookIcon size={32} round />
                </FacebookShareButton>
            </li>
            <li className={Style.shareListItem}>
                <WhatsappShareButton 
                    {...{ title, url }}
                    separator=":: "
                >
                    <WhatsappIcon size={32} round />
                </WhatsappShareButton>
            </li>
            <li className={Style.shareListItem}>
                <LinkedinShareButton 
                    {...{ title, url, summary }}
                    source="Garden Route Innovation & Technology Hub"
                >
                    <LinkedinIcon size={32} round />
                </LinkedinShareButton>
            </li>
        </ul>
    )
}

export default ShareButtons