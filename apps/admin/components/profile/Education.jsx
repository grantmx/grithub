import clsx from "clsx";
import Style from "./Profile.module.scss";
import utils from 'styles/globals/utils.module.scss';


function Education({ 
    attending_university, 
    graduated_highschool, 
    school_country, 
    school_degree,
    school_degree_status,
    school_major,
    school_name 
}){
    return(
        <li className={clsx(Style.submission, Style.complete)}>
            <header className={Style.submissionHeading}>
                <h2 className={Style.submissionTitle}>
                    Educational Background
                </h2>
            </header>

            <div className={Style.body}>
                <dl className={clsx(Style.list, Style.listRow)}>
                    <div className={Style.listGroup}>
                        <dd>{school_name}<br/>{school_country}</dd>
                        <dt>School & Address</dt>
                    </div>

                    {/* <div className={Style.listGroup}>
                        <dd>{graduated_highschool}</dd>
                        <dt>Graduated High School</dt>
                    </div> */}

                    <div className={Style.listGroup}>
                        <dd>{attending_university}</dd>
                        <dt className={utils.mb_2}>Attending University</dt>

                        <dd>{school_degree_status}</dd>
                        <dt>Degree Status</dt>
                    </div>

                    <div className={Style.listGroup}>
                        <dd>{school_degree}</dd>
                        <dt className={utils.mb_2}>Degree Type</dt>

                        <dd>{school_major}</dd>
                        <dt>Major</dt>
                    </div>

                </dl>

            </div>
        </li>
    )
}


export default Education