import PageHeader from "components/layout/PageHeader";
import { getLatestPosts } from "services/sanity/sanity.service";
import NewsroomPod from "components/newsroom/NewsroomPod";


export const metadata = {
    title: "Newsroom",
    description: "Innovating the Future: Stories, Insights, and Opportunities from GRIT Hub's Tech Ecosystem",
    keywords: "news, garden route, technology, innovation, ecosystem, insights, stories"
}



async function NewsHomePage(){
    const latest = await getLatestPosts({ number: 9 })

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


        </section>
    )
}

export default NewsHomePage