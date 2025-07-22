import { blurImage } from "@/lib/constants";
import Style from "app/(pages)/page.module.scss";
import Image from "next/image";
import Link from "next/link";



function NewsroomPod({ slug, mainImage, title, publishedAt }){
    return(
        <div className="col-xl-4 col-md-6 col-12 p-2 mb-4">
            <Link className="card shadow-sm h-100 text-decoration-none card-link" href={`/newsroom/${slug.current}`} title='Read More'>
                <Image 
                    src={mainImage} 
                    width={500} 
                    height={333} 
                    placeholder="blur"
                    blurDataURL={blurImage}
                    className={Style.cardTopImg} 
                    alt={title + " image"} 
                />
                
                <div className="card-body d-flex flex-column justify-content-between">
                    <h2 className="card-title fs-5 fw-bold">
                        {title}
                    </h2>
                    <small className="text-muted fs-7 mb-3">
                        {new Date(publishedAt).toLocaleDateString('en-GB', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </small>

                    <p className="mb-0">
                        <span className="rounded-pill btn-danger px-4 btn btn-sm fw-bold" >
                            Read more &nbsp;&rsaquo;
                        </span>
                    </p>
                </div>
            </Link>
        </div>
    )
}

export default NewsroomPod;