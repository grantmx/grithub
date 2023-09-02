"use client"

import { createColumnHelper } from '@tanstack/react-table'
import Link from 'next/link'

const columnHelper = createColumnHelper()

export const internsColumns = [
    columnHelper.accessor(row => `${row?.first_name +" "+ row?.last_name}`, {
        header: "Full Name",
        cell: info => {
            return(
                <Link href={{
                    pathname: `/people/interns/profile`,
                    query: { 
                        firstName: info.row.original.first_name,
                        lastName: info.row.original.last_name,
                    }
                }}>
                    {info.getValue()}
                </Link>
            )
        }
    }),
    columnHelper.accessor('school_name', {
        header: "Current School"
    }),
    columnHelper.accessor('home_city', {
        header: "Lives In"
    }),
    columnHelper.accessor('email', {
        header: "Email Address",
        cell: info => {
            return (
                <a href={`mailto:${info.getValue()}`} title="send an email">
                    {info.getValue()}
                </a>
            )
        },
    }),
    columnHelper.accessor('phone', {
        header: "Phone Number",
        cell: info => {
            return (
                <a href={`tel:${info.getValue()}`} title="make a phone call">
                    {info.getValue()}
                </a>
            )
        },
    }),
]