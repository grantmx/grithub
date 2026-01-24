import Image from "next/image";
import { getLatestPosts, getPostBySlug } from "services/sanity/sanity.service";
import Style from "../newsroom.module.scss";
import Link from "next/link";
import { toHTML } from '@portabletext/to-html'
import clsx from "clsx"
import NewsRoomSchema from "components/schema/NewsRoomSchema";
import { PortableText } from '@portabletext/react'
import ShareButtons from "components/newsroom/ShareButtons";
import { blurImage, voidPortableText } from "lib/constants";
import BodyImage from "components/newsroom/BodyImage";
import { cacheTag, cacheLife } from 'next/cache'


async function NewsArticle({ params }){
    const latest = await getLatestPosts({ end: 9 })
    const { slug } = await params;
    const post = await getPostBySlug(slug)

    // make this date human readable by day, full month, year: '2024-12-15T20:15:00.000Z'
    const date = new Date(post?.publishedAt).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    const customComponents = {
        types: {
            image: ({ value }) => <BodyImage {...{ value, Style }} />
        },
        marks: {
            hr: () =>  <hr className="my-4"/>,
            link: ({children, value}) => {
                const rel = !value.href.startsWith('/') ? 'noreferrer noopener' : undefined

                return (
                  <a href={value.href} rel={rel} target={rel ? "_blank" : undefined}>
                    {children}
                  </a>
                )
            },
        }
    }

    
   
    return(
        <>
            <section className="container-xxl d-flex py-md-5 p-4 flex-column flex-md-row mb-5">
                <article className="col-12 col-md-8 pe-md-5 mb-4">
                    <header className="mb-4">
                        <h1 className="display-6 fw-bold mb-3">
                            {post?.title}
                        </h1>

                        <ul className={clsx(Style.headerList, "text-muted fs-6")}>
                            <li className={Style.headerListItem}>
                                <ul className={Style.metaList}>
                                    <li className={Style.metaListItem}>
                                        Published on: {date}
                                    </li>
                                    <li className={Style.metaListItem}>
                                        By: {post?.author ?? "Garden Route Innovation & Technology Hub"}
                                    </li>
                                </ul>
                            </li>
                           

                            <li className={Style.headerListItem}>
                                <ShareButtons  
                                    body={post?.body}
                                    title={post?.title}
                                    url={`https://grithub.org.za/newsroom/${slug}`}
                                />
                            </li>
                        </ul>
                    </header>

                    <figure className={Style.figure}>
                        <Image 
                            className={Style.image} 
                            placeholder="blur"
                            blurDataURL={post?.mainImage + `?h=1&w3` ?? blurImage}
                            src={post?.mainImage} 
                            alt={post?.mainImageAlt ?? post?.title} 
                            width={900} 
                            height={450} 
                        />
                        {post?.mainImageCaption && (
                            <figcaption className={Style.caption}>
                                {post?.mainImageCaption}
                            </figcaption>
                        )}
                    </figure>


                    <div className={Style.body}>
                        <PortableText 
                            value={post?.body} 
                            components={customComponents}
                        />
                    </div>
                </article>




                <aside className="col-12 col-md-4">
                    <h3>Latest</h3>

                    <hr className="my-3"/>

                    <ul className="list-unstyled">
                        {latest.map((post) => {
                            return(
                                <li key={post?.slug?.current} className="mb-4">
                                    <Link href={`/newsroom/${post?.slug?.current}`} title={post.title}>
                                        <h4 className="fs-6 mb-1">
                                            {post.title}
                                        </h4>
                                    </Link>
                                    <small className="text-muted fs-7">
                                        {new Date(post?.publishedAt).toLocaleDateString('en-GB', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </small>
                                </li>
                            )
                        })}
                    </ul>
                </aside>
            </section>
        
            <NewsRoomSchema
                path={`https://grithub.org.za/newsroom/${slug}`}
                title={post?.title}
                description={post?.body}
                image={post?.mainImage}
                author={post?.author ?? "GRIT Hub Staff Writer"}
                postDate={post?.publishedAt}
                dateUpdated={post?._updatedAt}
            />
        </>
    )
}







export async function generateMetadata(props, parent) {
    const { slug } = await props.params;
    const post = await getPostBySlug(slug)

    const htmlBody = toHTML(post?.body, voidPortableText)
    const newMetaDescription = htmlBody.slice(0, 160).replace(/(<([^>]+)>)/gi, "")


    return {
        title: post?.title,
        description: htmlBody.slice(0, 160),
        alternates: {
            canonical: `https://grithub.org.za/newsroom/${slug}`
        },
        openGraph: {
            url: `https://grithub.org.za/newsroom/${slug}`,
            title: post?.title,
            description: newMetaDescription,
            type: "website",
            images:[{
                url: post?.mainImage,
                alt: post?.title,
                width: 800,
                height: 800,
            }]
        }
    }
}




export default NewsArticle