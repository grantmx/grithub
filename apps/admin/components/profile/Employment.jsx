import clsx from "clsx";
import Style from "./Profile.module.scss";
import utils from 'styles/globals/utils.module.scss';


function Employment({
    side_hustle,
    side_hustle_growth,
    side_hustle_statement,
    first_job,
    employer_name,
    job_country,
    job_city,
    job_title,
    job_provence,
    job_postal,
    job_end_date = null,
    job_start_date
}){
    return(
        <li className={clsx(Style.submission, Style.complete)}>
            <header className={Style.submissionHeading}>
                <h2 className={Style.submissionTitle}>
                    Employment Background
                </h2>
            </header>

            <div className={Style.body}>
                <dl className={clsx(Style.list, Style.listRow)}>
                    
                    {employer_name && (
                        <div className={Style.listGroup}>
                            <dd>{employer_name}<br/>{job_city}, {job_provence} {job_country}</dd>
                            <dt>Most Recent Employer</dt>
                        </div>
                    )}
                    

                    <div className={Style.listGroup}>
                        <dd>{job_title  ?? "N/a"}</dd>
                        <dt>Job Title</dt>
                    </div>

                    {job_start_date && (
                        <div className={Style.listGroup}>
                            <dd>{job_start_date  ?? "N/a"} - {job_end_date ? job_end_date : "Current"}</dd>
                            <dt>Employment Start/End</dt>
                        </div>
                    )}
                    

                    <div className={Style.listGroup}>
                        <dd>{side_hustle  ?? "N/a"}</dd>
                        <dt>Side Hustle?</dt>
                    </div>

                    <div className={Style.listGroup}>
                        <dd>{side_hustle_growth ?? "N/a"}</dd>
                        <dt>Grow Side Hustle?</dt>
                    </div>
                </dl>
            </div>

            <ul className={Style.essayList}>
                <li className={Style.essayItem}>
                    <h3 className={utils.fs_5}>
                        About My Side Hustle
                    </h3>
                    <p>
                        {side_hustle_statement  ?? "N/a"}
                    </p>                    
                </li>
            </ul>
        </li>
    )
}


export default Employment