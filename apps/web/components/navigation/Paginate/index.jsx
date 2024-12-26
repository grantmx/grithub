"use client"

import { useRouter } from "next/navigation";
import ReactPaginate from "react-paginate";
import PaginateBtn from "./PaginateBtn";


function Paginate({
    range = 3,
    pageCount,
    pathName = "/",
    containerClassName,
    pageClassName,
    pageLinkClassName,
    previousLinkClassName,
    nextLinkClassName,
    activeLinkClassName,
    btnClassName,
    disabledClassName,
    previousClassName,
    nextClassName
}){
    const router = useRouter();

    function pageChanged(event){
        const { selected } = event;
        const offSet = Math.ceil(selected * range);
        const next = offSet + range;

        router.push(pathName + `?previous=${offSet}&next=${next}`)
    }


    return(
        <ReactPaginate 
            pageRangeDisplayed={range}
            onPageChange={pageChanged}
            {...{ 
                containerClassName,
                renderOnZeroPageCount: null,
                breakLabel: "...",
                nextLabel: <PaginateBtn className={btnClassName} direction="next" />,
                previousLabel: <PaginateBtn className={btnClassName} />,
                pageCount,
                pageClassName,
                pageLinkClassName,
                previousLinkClassName,
                nextLinkClassName,
                activeLinkClassName,
                disabledClassName,
                previousClassName,
                nextClassName
            }}
        />
    )
}

export default Paginate;