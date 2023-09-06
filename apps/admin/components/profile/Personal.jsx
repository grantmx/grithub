import utils from 'styles/globals/utils.module.scss';
import Style from "./Profile.module.scss";

import clsx from "clsx";
import Image from "next/image";
import noImage from "public/assets/avatar.svg"


function Personal({ 
    first_name, 
    last_name, 
    email, 
    phone, 
    home_address, 
    home_city, 
    home_provence, 
    home_country,
    home_postal,
    preferred_name 
}){
    return(
        <li className={clsx(Style.submission, Style.submissionNoMark)}>
            <div className={clsx(Style.body, Style.bodyRow)}>
                <Image 
                    src={noImage}
                    width={200}
                    height={200}
                    alt="John M. Smith"
                    className={Style.image}
                />


                <dl className={clsx(Style.list, Style.listRow)}>
                    <div className={clsx(Style.listGroup, utils.pe_6)}>
                        <dd className={clsx(utils.fs_1, Style.span)}>
                            {first_name} {last_name}
                        </dd>
                        <dd>Preferred Name: {preferred_name}</dd>
                    </div>

                    <div className={Style.listGroup}>
                        <dd>
                            {home_address}<br/>
                            {home_city}, {home_postal} {home_provence}<br/> 
                            {home_country}
                        </dd>
                        <dt>Address</dt>
                    </div>

                    <div className={Style.listGroup}>
                        <dd>
                            <a href={`mailto:${email}`}>{email}</a>
                        </dd>
                        <dt className={utils.mb_2}>Email</dt>

                        <dd>{phone}</dd>
                        <dt>Phone</dt>
                    </div>
                </dl>
            </div>
        </li>
    )
}


export default Personal