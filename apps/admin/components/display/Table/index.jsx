"use client";

import Style from "./Table.module.scss"
import { flexRender, getCoreRowModel, useReactTable, getPaginationRowModel, getSortedRowModel } from '@tanstack/react-table'
import { defaultColumns, defaultData } from "./Table.helpers";
import { useEffect, useState } from "react";
import clsx from "clsx";
// import Pagination from "../../navigation/Pagination";
import { usePathname, useRouter } from "next/navigation";

function Table({ 
    tableData = null, 
    tableColumns = null,
    shouldPaginate = false, 
    totalPages = 10,
    onPageChange = () => null,
}){
    const [ data, setData ] = useState(() => [...tableData ?? defaultData])
    const [ columns, setColumns ] = useState(() => [ ...tableColumns ?? defaultColumns ])
    const [ sorting, setSorting ] = useState(null)

    const pathName = usePathname()
    const router = useRouter()
    const [ page, setPage ] = useState(1);

    useEffect(() => {
        setData([ ...tableData ])

    }, [ tableData ])

    
    useEffect(() => {
        onPageChange(page)

    }, [ page ])


    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
        },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })


    return(
        <>
            {/* {shouldPaginate && (
                <div className={Style.topPagination}>
                    <Pagination 
                        path={pathName}
                        {...{ page }}
                        count={totalPages} 
                        onChange={(e, num) => setPage(num)}
                    />
                </div>
            )} */}

            <table className={Style.block}>
                <thead>
                    {table.getHeaderGroups().map(headerGroup => {
                        return (
                            <tr key={headerGroup.id} className={Style.headerRow}>
                                {headerGroup.headers.map(header => {
                                    return (
                                        <th key={header.id} className={Style.headerCell}>
                                            <button
                                                type="button"
                                                className={clsx(Style.headerButton, header.column.getCanSort() && Style.headerButtonSortable)}
                                                onClick={header.column.getToggleSortingHandler()}
                                            >                                    
                                                {header.isPlaceholder ? null :(
                                                    flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )
                                                )}
                                            </button>
                                        </th>
                                    )
                                })}
                            </tr>
                        )
                    })}
                </thead>

                <tbody>
                    {table.getRowModel().rows.map(row => {
                        return(
                            <tr key={row.id} className={Style.row}>
                                {row.getVisibleCells().map(cell => {
                                    return (
                                        <td key={cell.id} className={Style.cell}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    )
                                })}
                            </tr>
                        )
                    })}
                </tbody>
            </table>

            {/* {shouldPaginate && (
                <div className={Style.pagination}>
                    <Pagination 
                        path={pathName}
                        {...{ page }}
                        count={totalPages} 
                        onChange={(e, num) => setPage(num)}
                    />
                </div>
            )} */}
        </>
    )
}


export default Table;