"use client"

import React from "react";
import { AnimatePresence } from 'framer-motion'
import Handheld from "components/Handheld";
import { StepperContextProvider } from "ui/components/navigation/Stepper/context/StepperContext";
import { useSearchParams } from 'next/navigation'
import Form from "components/Handheld/Form";
import PageTransition from "components/PageTransition";
import Sign from "components/Handheld/Sign";


function HandheldSignUp(){
    const searchParams = useSearchParams()
    const step = searchParams.get('step')

    return(
        <StepperContextProvider>
            <AnimatePresence initial={false} mode="popLayout">
                <PageTransition key={step}>
                    {!step && (
                        <Handheld />
                    )}

                    {step === "1" && (
                        <Form />
                    )}

                    {step === "2" && (
                        <Sign />
                    )}
                </PageTransition>
            </AnimatePresence>
        </StepperContextProvider>
    )
}


export default HandheldSignUp;