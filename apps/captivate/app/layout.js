import Style from "components/Handheld/styles/Handheld.module.scss"


export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>
                <main>
                    {children}
                </main>

                <footer className={Style.footer}>
                    <p className={Style.text}>
                        <small>&copy;2023 Garden Route Innovation & Technology Hub, NPC.  All Rights Reserved.</small>
                    </p>
                </footer>
            </body>
        </html>
    )
}