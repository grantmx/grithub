import clsx from "clsx";
import Style from "./Profile.module.scss";
import utils from 'styles/globals/utils.module.scss';


function Essay({ statement, skills }){
    return(
        <li className={clsx(Style.submission, Style.complete)}>
            <header className={Style.submissionHeading}>
                <h2 className={Style.submissionTitle}>
                    Statements
                </h2>
            </header>

            <div className={Style.body}>
                <ul className={clsx(Style.essayList, Style.essayRow)}>
                    <li className={Style.essayItem}>
                        <h3 className={utils.fs_5}>
                            Opportunity Statement
                        </h3>
                        <p>
                            {statement}
                        </p>                    
                    </li>

                    <li className={Style.essayItem}>
                        <h3 className={utils.fs_5}>
                            Skills
                        </h3>
                        <p>
                            {skills}
                        </p>
                    </li>

                   
                </ul>
            </div>
        </li> 
    )
}

export default Essay;