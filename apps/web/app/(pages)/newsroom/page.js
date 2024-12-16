import PageHeader from "components/layout/PageHeader";
import Image from "next/image";
import Link from "next/link";
import { getLatestPosts } from "services/sanity/sanity.service";
import Style from "app/(pages)/page.module.scss";

export const metadata = {
    title: "Newsroom",
    description: "Innovating the Future: Stories, Insights, and Opportunities from GRIT Hub's Tech Ecosystem",
    keywords: "news, garden route, technology, innovation, ecosystem, insights, stories"
}



async function NewsHomePage(){
    const latest = await getLatestPosts({ number: 3 })

    return(
        <section className="container-xxl d-flex py-md-5 p-4 flex-column mb-5">
            <PageHeader title="Newsroom" />
            
            <div className="col-12 d-flex flex-wrap">
                {latest.map((post) => {
                    return(
                        <div className="col-xl-4 col-md-6 col-12 p-2" key={post?.slug?.current}>
                            <Link className="card shadow-sm h-100 text-decoration-none card-link" href={`/newsroom/${post.slug.current}`} title='Read More'>
                                <Image 
                                    src={post?.mainImage} 
                                    width={500} 
                                    height={333} 
                                    placeholder="blur"
                                    blurDataURL={post?.mainImage + `?h=1&w1`}
                                    className={Style.cardTopImg} 
                                    alt={post.title + " post image"} 
                                />
                                
                                <div className="card-body d-flex flex-column justify-content-between">
                                    <h2 className="card-title fs-5">
                                        {post.title}
                                    </h2>
                                    <small className="text-muted fs-7 mb-3">
                                        {new Date(post?.publishedAt).toLocaleDateString('en-GB', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </small>

                                    <p className="mb-0">
                                        <strong className="rounded-pill btn-danger px-4 btn btn-sm fw-bold" >
                                            Read more &nbsp;&rsaquo;
                                        </strong>
                                    </p>
                                </div>
                            </Link>
                        </div>
                    )
                })}
                
            </div>


        </section>
    )
}

export default NewsHomePage