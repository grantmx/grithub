"use client"

import React from "react";
import { Controller } from "react-hook-form";


function FormControl({ name = "", children, className = "" }){
    return(
        <div className={className}>
            <Controller
                name={name}
                render={({ field }) => {
                    <>
                        {children}
                    </>
                }}
            />
        </div>
    )
}


export default FormControl;