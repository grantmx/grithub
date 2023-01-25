import React, { useState } from 'react';
import footer from '../styles/footer.module.scss'
import Image from 'next/image';

import serialize from 'form-serialize';
import jsonp from 'jsonp';


export default function FooterEmailForm(){
    const [ status, setStatus ] = useState({result: "init"});

    const submitForm = (e) => {
        let formData = serialize(e.target);
        let url = `https://grithub.us1.list-manage.com/subscribe/post-json?u=26e45841b4abf188b36813479&id=e04129a9c8&${formData}`;
        
        jsonp(url, { param: 'c' }, (err, data) => { 
            setStatus(data);

            // reshow the form so the user can try again
            if( data.result === "error" ){
                setTimeout(() => { setStatus({result: "init"}) }, 5000);
            }
        });
    };


    return(
        <div className={footer.formCntr}>
        {
            {
                "success":  <div className="d-flex justify-content-start align-items-center align-content-center">
                                <strong className="fw-bold fs-1 text-success lh-1 me-2">✓</strong>
                                <span className="text-success">{status.msg}</span>
                            </div>,

                "error":    <div className="d-flex justify-content-center align-items-center">
                                <strong className="fw-bold fs-1 text-danger lh-1 me-2">×</strong>
                                <span className="text-danger">{status.msg}. Please try again.</span>
                            </div>,

                "init":     <form onSubmit={(e) => { e.preventDefault(); submitForm(e) }} className="form-floating w-100 position-relative">
                                <input type="text" name="b_26e45841b4abf188b36813479_e04129a9c8" tabIndex="-1" defaultValue="" className={footer.formFieldB} />
                                <div className="form-floating">
                                    <input type="email" name="EMAIL" id="mce-EMAIL" required className="form-control" placeholder="name@example.com" />
                                    <label htmlFor="mce-EMAIL">Your Email</label>
                                </div>
                                <button type="submit" className={footer.submitBtn}>
                                    <Image src="/assets/chevron-right2.svg" width={20} height={60} alt="Submit"/>
                                </button>
                            </form>

            }[status.result]
        }
        </div>
    )
}