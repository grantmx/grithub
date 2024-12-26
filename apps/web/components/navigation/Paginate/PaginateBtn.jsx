import clsx from "clsx";


function PaginateBtn({ direction, className }){
    return(
        <svg 
            className={clsx(className)} 
            style={{ transform: `rotate(${direction === "next" ? "180deg" : "0"})` }} 
            viewBox="0 0 24 24"
        >
            <path d="M20.016 11.016v1.969h-12.188l5.578 5.625-1.406 1.406-8.016-8.016 8.016-8.016 1.406 1.406-5.578 5.625h12.188z"></path>
        </svg>
    ) 
}

export default PaginateBtn;