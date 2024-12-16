import PageHeader from "@/components/layout/PageHeader"




async function NewsArticle({ params, searchParams }){
    return(
        <section className="container-xxl d-flex py-md-5 p-4 flex-row mb-5">
            <div className="col-12 col-md-9 pe-md-5 mb-4">
                <PageHeader title="Newsroom" />
                
                <hr/>
            </div>

            <div className="col-12 col-md-3">
                <h3>Latest</h3>
            </div>
        </section>
    )
}

export default NewsArticle