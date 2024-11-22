module.exports = {
    reactStrictMode: true,
    transpilePackages: [
        "ui",
        "next-mdx-remote"
    ],
    webpack(config) {
        config.experiments = { 
            ...config.experiments, 
            topLevelAwait: true 
        }

        return config
    },
    env: {
        NEXT_PUBLIC_url: "https://grithub.org.za",
        NEXT_PUBLIC_GA_ID: 'G-NH2S1GEN8H'
    },
    async redirects() {
        return [
            // {
            //     source: '/programs/internship/apply',
            //     destination: '/programs/internship',
            //     permanent: false,
            // },
            {
                source: '/dojo',
                destination: '/programs/dojo',
                permanent: true,
            },
            {
                source: "/incubation",
                destination: "/programs/incubation",
                permanent: true
            }
        ]
    },
    async headers() {
        return [
            {
                source: "/api/eskomSE/:path*",
                headers: [
                    { key: "Access-Control-Allow-Credentials", value: "false" },
                    { key: "Access-Control-Allow-Origin", value: "*" },
                    { key: "Access-Control-Allow-Methods", value: "GET,POST" },
                    { key: "Access-Control-Allow-Headers", value: "Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date" },
                ]
            }
        ]
    }
};
