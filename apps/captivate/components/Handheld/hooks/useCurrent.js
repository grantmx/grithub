import { useEffect } from "react"
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { useCallback } from "react"


export default function useCurrent(current){
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()


    const createQueryString = useCallback((name, value) => {
          const params = new URLSearchParams(searchParams)
          params.set(name, value)
     
          return params.toString()
        }, [searchParams])


    useEffect(() => {
        router.push(pathname + '?' + createQueryString('current', current))

    }, [])
}