"use client";

import React, { forwardRef, useMemo } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'


const PageTransition = React.forwardRef(({
    children, 
    ...rest
}, ref ) => {
    return(
        <motion.div
			ref={ref}
			initial={{ x: 300, opacity: 0 }}
			animate={{ x: 0, opacity: 1 }}
			exit={{ x: -300, opacity: 0 }}
			{...rest}
		>
			{children}
		</motion.div>
    )
})

PageTransition.displayName = 'PageTransition';


export default PageTransition;