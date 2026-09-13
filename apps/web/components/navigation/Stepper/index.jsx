import clsx from "clsx";
import Style from "./Stepper.module.scss"
import Link from "next/link";



function Stepper({ steps = [], current = 1, path = "" }){
    return(
        <ol className={Style.block}>
            {steps.map((step, i) => {
                return(
                    <li 
                        className={clsx(Style.item, (i + 1) <= current && Style.active)} 
                        key={step.name}
                    >
                        <Link href={`${path}?step=${i + 1}`} className={Style.label}>
                            <h3 className={Style.heading}>
                                {step.name}
                            </h3>

                            <span className={clsx(Style.description, "text-muted")}>
                                {step.description}
                            </span>
                        </Link>
                    </li>
                )
            })}
        </ol>
    )
}


export default Stepper;