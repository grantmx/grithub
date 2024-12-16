import PageHeader from "components/layout/PageHeader";
import Image from "next/image";
import Link from "next/link";
import { getLatestPosts } from "services/sanity/sanity.service";
import Style from "app/(pages)/page.module.scss";

export const metadata = {
    title: "Newsroom",
    description: "Innovating the Future: Stories, Insights, and Opportunities from the Garden Route Tech Ecosystem",
    keywords: "news, garden route, technology, innovation, ecosystem, insights, stories"
}



async function NewsHomePage(){
    const latest = await getLatestPosts()

console.log(latest)
    return(
        <section className="container-xxl d-flex py-md-5 p-4 flex-column mb-5">
            <PageHeader title="Newsroom" subTitle="Innovating the Future: Stories, Insights, and Opportunities from the Garden Route Tech Ecosystem" />
        
            
            <div className="col-12 d-flex flex-wrap">
                {latest.map((post, index) => {
                    return(
                        <div className="col-xl-4 col-md-6 col-12 p-2" key={post?.slug?.current}>
                            <Link className="card shadow-sm h-100" href={`/newsroom/${post.slug.current}`} title='coworking spaces'>
                                <Image src="/assets/IMG_7441.jpg" width={500} height={333} className={Style.cardTopImg} alt="About our coworking spaces"/>
                                
                                <div className="card-body d-flex flex-column">
                                    <h2 className="card-title fs-4 fw-bold">Coworking</h2>
                                    <p className="card-text">Modern, sleek and creative spaces fostering collaboration and productivity so that you can work without distraction. <Link href="/cowork" className="text-decoration-underline" title="more about coworking">More &rsaquo;</Link></p>
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