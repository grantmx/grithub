"use client"

import React from "react";
import { AnimatePresence } from 'framer-motion'
import Handheld from "components/Handheld";
import { useSearchParams } from 'next/navigation'
import Form from "components/Handheld/Form";
import PageTransition from "components/PageTransition";
import Sign from "components/Handheld/Sign";
import Confirmation from "components/Handheld/Confirmation";
import MemberScan from "components/Handheld/MemberScan";
import TimeoutModal from "components/Handheld/TimeoutModal";
import AutomationOptions from "components/Handheld/AutomationOptions";
import MemberConfirmation from "components/Handheld/MemberConfirmation";
import ScanQRCode from "components/Handheld/ScanQRCode";
import ReadNFC from "components/Handheld/ReadNFC";
import { useEffect, useState } from "react";


function HandheldSignUp(){
    const searchParams = useSearchParams()
    const goto = searchParams.get('goto')
    const current = searchParams.get('current')
    const [ openModal, setOpenModal ] = useState(false)
    const [ direction, setDirection ] = useState(1)

    let timer = null;

    function restartTimer(){
        clearInterval(timer)

        timer = setInterval(() => {
            setOpenModal(true)
        }, 180000)
    }

    
    useEffect(() => {
        // if step has not changed in 3 minutes since it last changed then show modal
        if( current && current !== "1" ){
            restartTimer()
        }

        if( current && goto ){
            setDirection(parseInt(current) > parseInt(goto) ? -1 : 1)
        }

    }, [ current, goto ])


    function clear(){
        restartTimer()
        setOpenModal(false)
    }


    return(
        <>
            <AnimatePresence initial={false} mode="popLayout">
                <PageTransition key={goto} page={current} direction={direction}>
                    {(!goto || goto === "1") && (
                        <Handheld step={1} />
                    )}

                    {goto === "2" && (
                        <Form step={2} />
                    )}

                    {goto === "3" && (
                        <Sign step={3} />
                    )}

                    {goto === "5" && (
                        <MemberScan step={5} />
                    )}

                    {goto === "6" && (
                        <AutomationOptions step={6} />
                    )}

                    {goto === "7" && (
                        <ScanQRCode step={7} />
                    )}

                    {goto === "8" && (
                        <ReadNFC step={8} />
                    )}



                    {goto === "99" && (
                        <Confirmation step={4} />
                    )}

                    {goto === "98" && (
                        <MemberConfirmation step={8} />
                    )}
                </PageTransition>
            </AnimatePresence>

            {openModal && (
                <TimeoutModal onClear={clear} />
            )}
            
        </>
    )
}


export default HandheldSignUp;