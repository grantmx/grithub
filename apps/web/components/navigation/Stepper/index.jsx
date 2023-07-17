import clsx from "clsx";
import Style from "./Stepper.module.scss"



function Stepper({ steps = [] }){
    return(
        <ol className={Style.block}>
            {steps.map((step, i) => {
                return(
                    <li className={clsx(Style.item, i === 0 && Style.active)} key={step.name}>
                        <div className={Style.label}>
                            <h3 className={Style.heading}>
                                {step.name}
                            </h3>

                            <span className={clsx(Style.description, "text-muted")}>
                                {step.description}
                            </span>
                        </div>
                    </li>
                )
            })}
        </ol>
    )
}


export default Stepper;