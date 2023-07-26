import GeneralPage from "components/layout/GeneralPage";
import { useRouter } from "next/router";


function NotFound(){
    const router = useRouter()

    return(
        <GeneralPage 
            title="404"
            centerTitle
		>
            <section className="container-xxl d-flex p-md-5 p-4 flex-column mb-5" id="coworking">
                <span className="display-1 text-center">🤔</span>
                <h1 className="text-center">Doh! Sorry about that.</h1>
                <p className="text-center">But unfortunately we can't find that page anywhere. <a href="#" onClick={() => router.back()}>Go Back</a></p>
            </section>
        </GeneralPage>
    )
}


export default NotFound;