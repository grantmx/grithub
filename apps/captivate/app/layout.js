import Style from "components/Handheld/styles/Handheld.module.scss"


export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <head>
                <link rel="manifest" href="manifest.json" />
            </head>

            <body>
                <main className={Style.main}>
                    {children}
                </main>

                <footer className={Style.footer}>
                    <p className={Style.text}>
                        <small>&copy;{new Date().getFullYear()} Garden Route Innovation & Technology Hub, NPC.  All Rights Reserved.</small>
                    </p>
                </footer>
            </body>
        </html>
    )
}