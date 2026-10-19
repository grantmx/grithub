import { Footer, Layout, Navbar } from "nextra-theme-docs";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import "nextra-theme-docs/style.css";

export const metadata = {
  title: {
    default: "GRIT Hub SOPs",
    template: "%s | GRIT Hub SOPs",
  },
  description: "Internal standard operating procedures for GRIT Hub.",
};

const navbar = <Navbar logo={<b>GRIT Hub SOPs</b>} />;
const footer = (
  <Footer>
    GRIT Hub (Garden Route Innovation and Technology Hub) internal SOPs ·{" "}
    {new Date().getFullYear()}
  </Footer>
);

export default async function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          navbar={navbar}
          footer={footer}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/grantmx/grithub/edit/main/apps/docs"
          editLink="Edit this page on GitHub"
          darkMode
          sidebar={{ defaultOpen: true }}
          toc={{ float: true }}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
