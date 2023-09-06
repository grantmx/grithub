import dynamic from 'next/dynamic'

const IconClose = dynamic(() => import("./IconClose").then(module => module.IconClose))
const IconInputError = dynamic(() => import("./IconInputError").then(module => module.IconInputError))
const IconSearch = dynamic(() => import("./IconSearch").then(module => module.IconSearch))


export{
    IconClose,
    IconInputError,
    IconSearch
}