import imageUrlBuilder from "@sanity/image-url";
import { sanityClient } from "services/sanity/sanity.service";
import Image from "next/image";
import clsx from "clsx";
import { blurImage } from "@/lib/constants";

const MAX_WIDTH = { full: 800, medium: 560, small: 360 };

// Sanity asset refs encode the original size: "image-<id>-1200x800-jpg"
function getDimensions(ref) {
    const match = /-(\d+)x(\d+)-/.exec(ref ?? "");
    return match ? { width: Number(match[1]), height: Number(match[2]) } : null;
}

function isExternal(href) {
    return /^https?:\/\//i.test(href);
}

function BodyImage({ value, Style }){
    if (!value?.asset) return null;

    const size = MAX_WIDTH[value.size] ? value.size : "full";
    const maxWidth = MAX_WIDTH[size];
    const original = getDimensions(value.asset._ref);

    // Respect the editor's crop when working out the aspect ratio
    const crop = value.crop ?? { top: 0, bottom: 0, left: 0, right: 0 };
    const ratio = original
        ? (original.height * (1 - crop.top - crop.bottom)) / (original.width * (1 - crop.left - crop.right))
        : 547 / 800;

    const width = original ? Math.min(maxWidth, Math.round(original.width * (1 - crop.left - crop.right))) : maxWidth;
    const height = Math.round(width * ratio);

    const imageUrl = imageUrlBuilder(sanityClient).image(value).width(width * 2).fit("max").auto("format").url();

    const image = (
        <Image
            className={Style.image}
            src={imageUrl}
            width={width}
            height={height}
            sizes={`(max-width: ${width}px) 100vw, ${width}px`}
            alt={value?.alt ?? ""}
            placeholder="blur"
            blurDataURL={blurImage}
        />
    );

    const href = value?.link;
    const newTab = value?.openInNewTab ?? isExternal(href);

    return (
        <figure className={clsx(Style.figure, size !== "full" && Style[`figure_${size}`])}>
            {href ? (
                <a
                    className={Style.imageLink}
                    href={href}
                    target={newTab ? "_blank" : undefined}
                    rel={isExternal(href) ? "noopener noreferrer" : undefined}
                    title={value?.caption || value?.alt || undefined}
                >
                    {image}
                </a>
            ) : image}

            {value?.caption && (
                <figcaption className={Style.caption}>
                    {value.caption}
                </figcaption>
            )}
        </figure>
    )
}

export default BodyImage
