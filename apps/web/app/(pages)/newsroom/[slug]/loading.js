import Style from "../newsroom.module.scss";
import clsx from "clsx"
import Skeleton from "components/feedback/Skeleton";


async function NewsArticleLoader(){    
   
    return(
        <>
            <section className="container-xxl d-flex py-md-5 p-4 flex-column flex-md-row mb-5">
                <article className="col-12 col-md-8 pe-md-5 mb-4">
                    <header className="mb-4">
                        <h1 className="display-6 fw-bold mb-3">
                            <Skeleton height={32} width="80%" className="mb-2" />
                            <Skeleton height={32} width="60%" className="mb-2" />
                            <Skeleton height={32} width="50%" className="mb-2" />
                        </h1>

                    </header>

                    <figure className={Style.figure}>
                        <Skeleton height={450} width="100%" />
                    </figure>


                    <div className={Style.body}>
                        <Skeleton height={20} width="100%" className="mb-2" />
                        <Skeleton height={20} width="100%" className="mb-2" />
                        <Skeleton height={20} width="50%" />
                    </div>``
                </article>




                <aside className="col-12 col-md-4">
                    <h3>
                        <Skeleton height={40} width="60%" />
                    </h3>

                    <hr className="my-3"/>

                    <ul className="list-unstyled">
                        <li className="mb-4">
                            <Skeleton height={20} width="100%" className="mb-2" />
                            <Skeleton height={20} width="50%" />
                        </li>

                        <li className="mb-4">
                            <Skeleton height={20} width="100%" className="mb-2" />
                            <Skeleton height={20} width="50%" />
                        </li>

                        <li className="mb-4">
                            <Skeleton height={20} width="100%" className="mb-2" />
                            <Skeleton height={20} width="50%" />
                        </li>
                    </ul>
                </aside>
            </section>
        </>
    )
}








export default NewsArticleLoader