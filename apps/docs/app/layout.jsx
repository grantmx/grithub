import { Footer, Layout, Navbar } from "nextra-theme-docs";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import "nextra-theme-docs/style.css";
import "./logo.css";

export const metadata = {
  title: {
    default: "GRIT Hub SOPs",
    template: "%s | GRIT Hub SOPs",
  },
  description: "Internal standard operating procedures for GRIT Hub.",
  robots: { index: false, follow: false },
};

const navbar = (
  <Navbar
    logo={
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="grit-logo"
        src="/grithub-logo-horz-all-white.svg"
        alt="GRIT Hub SOPs"
        height={50}
        style={{ height: 50, width: "auto" }}
      />
    }
  />
);
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
