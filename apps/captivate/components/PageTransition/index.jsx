"use client";

import React from 'react'
import { motion } from 'yar'

const variants = {
	enter: (direction) => {
		return {
			x: direction > 0 ? 1000 : -1000,
			opacity: 0
		};
	},
	center: {
		zIndex: 1,
		x: 0,
		opacity: 1
	},
	exit: (direction) => {
		return {
			zIndex: 0,
			x: direction < 0 ? 1000 : -1000,
			opacity: 0
		};
	}
};


const PageTransition = React.forwardRef(({
    children, 
	direction,
	page,
    ...rest
}, ref ) => {

	return(
        <motion.div
			ref={ref}
			key={page}
			custom={direction}
			variants={variants}
			style={{ width: "100%" }}
			initial="enter"
			animate="center"
			exit="exit"
			transition={{
				x: { type: "spring", stiffness: 300, damping: 30 },
				opacity: { duration: 0.2 }
			}}	
			{...rest}
		>
			{children}
		</motion.div>
    )
})

PageTransition.displayName = 'PageTransition';


export default PageTransition;