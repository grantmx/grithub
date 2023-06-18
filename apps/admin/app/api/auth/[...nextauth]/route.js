import NextAuth from "next-auth"
import EmailProvider from "next-auth/providers/email"
import { FirestoreAdapter } from "@next-auth/firebase-adapter";
import { firebaseConfig } from "lib/firebaseConfig";


export const authOptions = {
    adapter: FirestoreAdapter(firebaseConfig),
    providers: [
        EmailProvider({
            server: process.env.EMAIL_SERVER,
            from: process.env.EMAIL_FROM
        }),
    ],
}

const handler = NextAuth(authOptions)

export { 
    handler as GET, 
    handler as POST 
}

