import Image from "next/image";
import { getLatestPosts, getPostBySlug } from "services/sanity/sanity.service";
import Style from "../newsroom.module.scss";
import Link from "next/link";
import { toHTML } from '@portabletext/to-html'
import clsx from "clsx"
import NewsRoomSchema from "components/schema/NewsRoomSchema";


async function NewsArticle({ params }){
     const latest = await getLatestPosts({ number: 9 })

    const { slug } = await params;
    const post = await getPostBySlug(slug)

    // make this date human readable by day, full month, year: '2024-12-15T20:15:00.000Z'
    const date = new Date(post.publishedAt).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    const htmlBody = toHTML(post?.body)
    
   
    return(
        <>
            <section className="container-xxl d-flex py-md-5 p-4 flex-column flex-md-row mb-5">
                <div className="col-12 col-md-8 pe-md-5 mb-4">
                    <h1 className="display-6 fw-bold mb-3">
                        {post?.title}
                    </h1>

                    <ul className="list-unstyled text-muted fs-6">
                        <li>Published on: <strong>{date}</strong></li>
                        <li>By: <strong>{post?.author ?? "Garden Route Innovation & Technology Hub"}</strong></li>
                    </ul>

                    <hr className="my-4 my-md-5"/>

                    <Image 
                        className={clsx(Style.image, "mb-4")} 
                        placeholder="blur"
                        blurDataURL={post?.mainImage + `?h=1&w3`}
                        src={post?.mainImage} 
                        alt={post.title} 
                        width={900} 
                        height={450} 
                    />

                    <div 
                        className={Style.body} 
                        dangerouslySetInnerHTML={{ __html: htmlBody }} 
                    />
                </div>



                <div className="col-12 col-md-4">
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
                </div>
            </section>
        
            <NewsRoomSchema
                path={`https://grithub.org.za/newsroom/${slug}`}
                title={post?.title}
                metaDescription={htmlBody.slice(0, 160)}
                image={post?.mainImage}
                author={post?.author ?? "GRIT Hub Staff Writer"}
                postDate={post.publishedAt}
                dateUpdated={post?._updatedAt}
            />
        </>
    )
}



export async function generateMetadata(props, parent) {
    const { slug } = await props.params;
    const post = await getPostBySlug(slug)

    const htmlBody = toHTML(post?.body)
    const newMetaDescription = htmlBody.slice(0, 160).replace(/(<([^>]+)>)/gi, "")


    return {
        title: post.title,
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
                alt: post.title,
                width: 800,
                height: 800,
            }]
        }
    }
}




export default NewsArticle