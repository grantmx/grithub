import GeneralPage from "../components/layout/GeneralPage";


function Terms(){
    return(
        <GeneralPage 
            title="Terms of Use"
        >
            <section className="container-fluid d-flex justify-content-center align-items-center py-5 flex-column" id="programs-workshops">
                <article className="col-12 col-md-8">
                    <h2 className="mb-5">By visiting this site you agree to the terms of this agreement.</h2>
                    
                    <h3>1. IMPORTANT INFORMATION</h3>
                    <p>You should carefully read the following terms and conditions. Your purchase or use of our products implies that you have read and accepted these terms and conditions.</p>
                    
                    <h3>2. LICENSE</h3>
                    <p>Our website grants you a nonexclusive limited license to use the web templates and other products sold through our web site by independent content providers (the "products") in accordance with these Terms and Conditions (the "license") issued by our company.</p>
                    <ol className="terms">
                        <li><strong>LIMITED USAGE GRANTED</strong><br />
                        <p>You may only use each individual product on a single website, belonging to either you or your client. You have to purchase same template once more in order to make another project with the same design </p></li>
                        <li><strong>MODIFICATIONS</strong><br />
                        <p>You are authorized to make any necessary modification(s) to our products to fit your purposes.</p></li>
                        <li><strong>UNAUTHORIZED USE</strong><br />
                        <p>You may not place any of our products, modified or unmodified, on a diskette, CD, website or any other medium and offer them for redistribution or resale of any kind without prior written consent from our company.</p></li>
                        <li><strong>ASSIGNABILITY</strong><br />
                        <p>You may not sub-license, assign, or transfer this license to anyone else without prior written consent from our company.</p></li>
                        <li><strong>OWNERSHIP </strong><br />
                        <p>You may not claim intellectual or exclusive ownership to any of our products, modified or unmodified. All products are property of independent content providers.</p></li>
                    </ol>
                    <p>Our products are provided "as is" without warranty of any kind, either expressed or implied. In no event shall our juridical person be liable for any damages including, but not limited to, direct, indirect, special, incidental or consequential damages or other losses arising out of the use of or inability to use our products.</p>
                    
                    <h3>3. OUR REFUND POLICY </h3>
                    <p>Since our company is offering non-tangible irrevocable goods we do not issue refunds after the product is shipped, which you are responsible for understanding upon purchasing any article at our site.&nbsp; We only make exceptions with this rule when the product appears to be not-as-described on a case by case basis in agreement of the parties concerned.&nbsp; The deadline for any refund claim is one week after the delivery date. The refund is issued to you after we receive a Waiver of Copyright signed by you. This is a required condition.</p>
                    
                    <h3>4. ANTIFRAUD CHECK </h3>
                    <p>Customer purchase can be suspended for manual antifraud check for 10-20 minutes as well as it can be suspended for longer term (around 20 hours) for more serious investigation. Antifraud check occurs because of growing number of fraud transactions from persons who are not actual cardholders of the credit cards used during purchase.</p>
                    <p>Our company reserves the right to change or modify these terms with no prior notice.</p>
                </article>
            </section>
        </GeneralPage>
    )
}


export default Terms