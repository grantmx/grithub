"use client";

import Style from "./Table.module.scss"
import { useState } from "react";
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { defaultColumns, defaultData } from "./Table.helpers";


function Table({ tableData = null, tableColumns = null }){
    const [ data, setData ] = useState(() => [ ...tableData ?? defaultData ])
    const [ columns, setColumns ] = useState(() => [ ...tableColumns ?? defaultColumns ])

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })


    return(
        <table className={Style.block}>
            <thead>
                {table.getHeaderGroups().map(headerGroup => {
                    return (
                        <tr key={headerGroup.id} className={Style.headerRow}>
                            {headerGroup.headers.map(header => {
                                return (
                                    <th key={header.id} className={Style.headerCell}>
                                        {header.isPlaceholder ? null :(
                                            flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )
                                        )}
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
    )
}


export default Table;