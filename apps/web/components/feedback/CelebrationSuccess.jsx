"use client"

import { celebrationTime } from "lib/utils/celebrationTime";
import { useEffect } from "react";


function CelebrationSuccess(){
    useEffect(() => celebrationTime(), [])

    return null
}

export default CelebrationSuccess;