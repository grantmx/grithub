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
            <form className="form-floating" action="https://sandbox.payfast.co.za​/eng/process" method="post">
                <input type="hidden" name="merchant_id" value="10000100" />
                <input type="hidden" name="merchant_key" value="46f0cd694581a" />
                <input type="hidden" name="amount" value="100.00" />
                <input type="hidden" name="item_name" value="Test Product" />
                <input type="hidden" name="item_description" value="A test product" />

                <input type="hidden" name="name_first" value="John" />
                <input type="hidden" name="name_last" value="Doe" />
                <input type="hidden" name="email_address" value="john@doe.com"/>
                <input type="hidden" name="cell_number" value="0823456789" /> 
                <input type="hidden" name="email_confirmation" value="1" />
                <input type="hidden" name="confirmation_address" value="john@doe.com" /> 

                <input type="hidden" name="return_url" value="https://www.example.com/success" />
                <input type="hidden" name="cancel_url" value="https://www.example.com/cancel" />
                <input type="hidden" name="notify_url" value="https://www.example.com/notify" />
            </form>
        </div>
    )
}

export default PayDetails;