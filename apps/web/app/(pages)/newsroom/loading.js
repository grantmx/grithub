import Skeleton from "components/feedback/Skeleton"


async function NewsHomeLoader(){
    return(
        <section className="container-xxl d-flex py-md-5 p-4 flex-column mb-5">
            <Skeleton height={86} width="30%" />
            
            
            <div className="col-12 d-flex mt-4 gap-3">
                <Skeleton height={300} width="33%" />
                <Skeleton height={300} width="33%" />
                <Skeleton height={300} width="33%"/>   
            </div>

            <div className="col-12 d-flex mt-4 gap-3">
                <Skeleton height={300} width="33%" />
                <Skeleton height={300} width="33%" />
                <Skeleton height={300} width="33%"/>     
            </div>
        </section>
    )
}

export default NewsHomeLoader

