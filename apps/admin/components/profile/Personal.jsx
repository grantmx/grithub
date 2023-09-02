import clsx from "clsx";
import Style from "./Profile.module.scss";
import Link from "next/link";
import Image from "next/image";



function Personal(){
    return(
        <li className={Style.submission}>
            <header className={Style.submissionHeading}>
                <h2 className={Style.submissionTitle}>
                    Personal Information
                </h2>
            </header>

            <div className={clsx(Style.body, Style.bodyRow)}>
                <Image 
                    src="https://preview.keenthemes.com/keen/demo1/assets/media//avatars/300-1.jpg"
                    width={300}
                    height={300}
                    alt="John M. Smith"
                    className={Style.image}
                />


                <dl className={clsx(Style.list, Style.listCol)}>
                    <div className={Style.listGroup}>
                        <dd>John M. Smith</dd>
                        <dt>Full Name</dt>
                    </div>

                    <div className={Style.listGroup}>
                        <dd>john.smith@example.com</dd>
                        <dt>Email</dt>
                    </div>

                    <div className={Style.listGroup}>
                        <dd>(123) 456-7890</dd>
                        <dt>Phone</dt>
                    </div>

                    <div className={Style.listGroup}>
                        <dd>123 Main Street<br/>Somewhere, GA 3000</dd>
                        <dt>Address</dt>
                    </div>
                </dl>
            </div>
        </li>
    )
}


export default Personal