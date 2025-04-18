"use client"

import { useEffect, useMemo, useState } from "react";
import { pdfjs, Document, Page } from "react-pdf";
import Style from "./Pdf.module.scss";
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import "keen-slider/keen-slider.min.css";
import { useKeenSlider } from "keen-slider/react";
import clsx from "clsx";
// import Skeleton from "components/feedback/Skeleton"


try{
	pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString()

}catch(e){
	  console.log(e);
}

const maxWidth = 800;


function Pdf({ filePath }){
    const [ numPages, setNumPages ] = useState();
  	const [ pageNumber, setPageNumber ] = useState(1);


	  const [ sliderRef, instanceRef ] = useKeenSlider(
        {
            initial: 0,
            slides: {
                perView: 1,
            },
        }
    )

	useEffect(() => {
		setTimeout((instanceRef) => {
			if(instanceRef.current && typeof instanceRef?.current?.update === "function" ){
				instanceRef?.current.update({
					initial: 0,
					slides: {
						perView: 1,
					},
					slideChanged(slider) {
						setPageNumber(slider.track.details.rel);
					}
				})
			}
		}, 100, instanceRef);		
		
	}, [ instanceRef?.current])



	const slides = useMemo(() => {
		return(
			<>
				{Array.from(new Array(numPages), (_el, index) => (
					<div className="keen-slider__slide" key={`page_${index + 1}`}>
						<Page 
							pageNumber={index + 1} 
							width={maxWidth}
						/>
					</div>
				))}
			</>
		)

	}, [numPages]);



	function onDocumentLoadSuccess({ numPages }){
		setNumPages(numPages);
	}

	return(
		<>
			<article className={clsx(Style.cntr, "border shadow-lg")} ref={sliderRef}>
				<Document 
					file={filePath} 
					onLoadSuccess={onDocumentLoadSuccess}  
					options={{
						cMapUrl: '/cmaps/',
						standardFontDataUrl: '/standard_fonts/',
					}}
					className="keen-slider"
					// loading={<Skeleton width="400px" height="200px" />}
				>
					{slides}
				</Document>
			</article>

			{numPages && (
				<nav className={Style.nav}>
					<button 
						type="button"
						className="btn btn-danger"
						onClick={(e) => e.stopPropagation() || instanceRef?.current?.prev()}
					>
						<svg className={Style.icon} id="icon-keyboard_arrow_left" viewBox="0 0 24 24" width={24} height={24}>
							<path d="M15.422 16.594l-1.406 1.406-6-6 6-6 1.406 1.406-4.594 4.594z"></path>
						</svg>
					</button>

					<p className={Style.pageOf}>
						{pageNumber +" of "+ numPages}
					</p>

					<button 
						type="button"
						className="btn btn-danger"
						onClick={(e) => e.stopPropagation() || instanceRef?.current?.next()}
					>
						<svg className={Style.icon} id="icon-keyboard_arrow_right" viewBox="0 0 24 24" width={24} height={24}>
							<path d="M8.578 16.594l4.594-4.594-4.594-4.594 1.406-1.406 6 6-6 6z"></path>
						</svg>
					</button>
				</nav>
			)}
			
		</>
	)
}

export default Pdf;