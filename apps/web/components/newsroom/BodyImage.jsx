import imageUrlBuilder from "@sanity/image-url";
import { sanityClient } from "services/sanity/sanity.service";
import Image from "next/image";
import { blurImage } from "@/lib/constants";


function BodyImage({ value, Style }){
    const imageUrl = imageUrlBuilder(sanityClient).image(value).width(800).fit('max').auto('format').url()
    
    return (
        <figure className={Style.figure}>
            <Image 
                className={Style.image}
                src={imageUrl}
                width={800}
                height={547}
                alt={value?.alt ?? "image"}
                placeholder="blur"
                blurDataURL={blurImage}
            />

            <figcaption className={Style.caption}>
                {value?.caption}
            </figcaption>
        </figure>
    )
}

export default BodyImage