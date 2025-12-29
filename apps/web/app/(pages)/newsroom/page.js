import PageHeader from "components/layout/PageHeader";
import { getLatestPosts, getPosts } from "services/sanity/sanity.service";
import NewsroomPod from "components/newsroom/NewsroomPod";
import Paginate from "components/navigation/Paginate";
import Style from "./newsroom.module.scss";


export const revalidate = 43200000

async function NewsHomePage({ searchParams}){
    const pageRange = 9;

    const { previous, next } = await searchParams ?? null;
    const latest = await getLatestPosts({ start: previous ?? 0, end: next ?? pageRange })

    const totalPosts = await getPosts()
    let totalPages = Math.ceil(totalPosts.length / pageRange)
    totalPages = totalPages === 1 ? 0 : totalPages

    return(
        <section className="container-xxl d-flex py-md-5 p-4 flex-column mb-5">
            <PageHeader title="Newsroom" />
            
            <div className="col-12 d-flex flex-wrap">
                {latest.map((post) => {
                    return(
                        <NewsroomPod key={post.slug?.current} {...post} />
                    )
                })}
            </div>

            <Paginate 
                range={pageRange}
                pageCount={totalPages}
                pathName="/newsroom"
                containerClassName={Style.paginateBlock}
                pageClassName={Style.pageItem}
                pageLinkClassName={Style.pageItemLink}
                previousLinkClassName={Style.pageItemLink}
                nextLinkClassName={Style.pageItemLink}
                activeLinkClassName={Style.activePage}
                btnClassName={Style.pageBtn}
                disabledClassName={Style.disabled}
                nextClassName={Style.pageBtnItem}
                previousClassName={Style.pageBtnItem}
            />
        </section>
    )
}

export default NewsHomePage


export async function generateMetadata({ params, searchParams }) {
    const { previous, next } = await searchParams
    const canonical = previous ? `https://grithub.org.za/newsroom?previous=${previous}&next=${next}` : `https://grithub.org.za/newsroom`
    
    return {
        title: "Newsroom",
        description: "Innovating the Future: Stories, Insights, and Opportunities from GRIT Hub's Tech Ecosystem",
        keywords: "news, garden route, technology, innovation, ecosystem, insights, stories",
        openGraph:{
            title: "Newsroom",
            description: "Innovating the Future: Stories, Insights, and Opportunities from GRIT Hub's Tech Ecosystem",
            url: "https://grithub.co.za/newsroom",
            siteName: "GRIT Hub",
        },
        alternates: {
            canonical
        }
    }
}