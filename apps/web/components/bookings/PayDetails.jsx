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



    // useEffect(() => {
    //     axios.post("/api/payfast/generatePayId").then(response => {
    //         console.log(response)

    //     }).catch(err => {
    //         console.log(err.response)
    //     })

    // }, [])


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

                <input type="hidden" name="return_url" value="https://grithub.org.za/cowork/book/success" />
                <input type="hidden" name="cancel_url" value="https://grithub.org.za/cowork/book/cancel" />

                <h2>Review Booking</h2>

                <fieldset className="d-flex flex-row">
                    <ul className="list-unstyled">
                        <li><strong>Name</strong>: {globalBook.data.workspace}</li>
                        <li><strong>Email</strong>: {globalBook.data.guests}</li>
                        <li><strong>Phone</strong>: {globalBook.data.date} @ {globalBook.data.arrival}</li>
                    </ul>

                    <ul className="list-unstyled">
                        <li><strong>Workspace</strong>: {globalBook.data.workspace}</li>
                        <li><strong>Guests</strong>: {globalBook.data.guests}</li>
                        <li><strong>Arrival</strong>: {globalBook.data.date} @ {globalBook.data.arrival}</li>
                        <li><strong>Booking duration</strong>: {globalBook.data.duration}</li>
                    </ul>
                </fieldset>
            </form>
        </div>
    )
}

export default PayDetails;