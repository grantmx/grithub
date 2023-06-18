import Image from "next/image";
import { createColumnHelper } from '@tanstack/react-table'


export const defaultData = [
    {
        image: "https://dummyimage.com/200x200/cccccc/999999.png",
        firstName: 'tanner',
        lastName: 'linsley',
        age: 24,
        visits: 100,
        status: 'Member',
        progress: 50,
    },
    {
        image: "https://dummyimage.com/200x200/cccccc/999999.png",
        firstName: 'tandy',
        lastName: 'miller',
        age: 40,
        visits: 40,
        status: 'Member',
        progress: 80,
    },
    {
        image: "https://dummyimage.com/200x200/cccccc/999999.png",
        firstName: 'joe',
        lastName: 'dirte',
        age: 45,
        visits: 20,
        status: 'Non-Member',
        progress: 10,
    },
];


const columnHelper = createColumnHelper()

export const defaultColumns = [
    columnHelper.accessor('image', {
        header: null,
        cell: info => {
            return(
                <Image 
                    src={info.getValue()} 
                    width="30"
                    height="30"
                    alt=""
                />
            )
        },
    }),
    columnHelper.accessor('firstName', {
        cell: info => info.getValue(),
        header: "First Name"
    }),
    columnHelper.accessor(row => row.lastName, {
        cell: info => info.getValue(),
        header: "Last Name",
    }),
    columnHelper.accessor('age', {
        header: 'Age',
        cell: info => info.getValue(),
    }),
    columnHelper.accessor('visits', {
        header: "Visits",
    }),
    columnHelper.accessor('status', {
        header: 'Status',
    }),
]