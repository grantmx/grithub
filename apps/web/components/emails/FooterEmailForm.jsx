"use client"

import React, { useState } from 'react';
import footer from 'components/navigation/footer.module.scss'
import Image from 'next/image';
import serialize from 'form-serialize';
import submitEmailAction from "./submitEmailAction";
import Loader from "components/feedback/Loader";


export default function FooterEmailForm(){
    const [ status, setStatus ] = useState({result: "init"});
    const [ isLoading, setIsLoading ] = useState(false);


    const submitForm = async (e) => {
        setIsLoading(true);
        e.preventDefault()

        let formData = serialize(e.target);

        // turn formdata into an object
        formData = Object.fromEntries(new FormData(e.target));

        await submitEmailAction(formData).then((res) => {
            setStatus({result: res.result === "success" ? "success" : "error", msg: res.msg});    
            setIsLoading(false);
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

                "init":     <form onSubmit={(e) => submitForm(e)} className="form-floating w-100 position-relative">
                                <label htmlFor="fieldDB" className={footer.formFieldB}>Field</label>
                                <input type="text" id="fieldDB" name="b_26e45841b4abf188b36813479_e04129a9c8" tabIndex="-1" className={footer.formFieldB} />

                                <div className="form-floating">                                    
                                    <input type="email" name="fldZtEVbPJXw0mTX4" id="fldZtEVbPJXw0mTX4" className="form-control" placeholder="name@example.com" />
                                    <label htmlFor="fldZtEVbPJXw0mTX4">Your Email</label>
                                </div>

                                <button type="submit" className={footer.submitBtn}>
                                    {isLoading ? (
                                        <Loader {...{ isLoading }} isDark />
                                    ):(
                                        <Image src="/assets/chevron-right2.svg" width={20} height={60} alt="Submit"/>
                                    )}
                                </button>
                            </form>

            }[status.result]
        }
        </div>
    )
}