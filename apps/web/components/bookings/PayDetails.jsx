import { useRouter } from "next/router"
import { useContext, useEffect } from "react"


function PayDetails(){
    const router = useRouter()
    const [ globalBook, dispatch ] = useContext(StepperContext)

    useEffect(() => {
        if( globalBook.current !== 3 ){
            router.push({ href: "/cowork/book", query: { step: 2 } })
        }

    }, [ globalBook ])



    return(
        <div className={clsx(Style.form, "col-8")}>
            <form className="form-floating">

            </form>
        </div>
    )
}

export default PayDetails;