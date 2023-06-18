module.exports = {
    reactStrictMode: true,
    transpilePackages: ["ui"],
    env: {
        NEXT_PUBLIC_GA_ID: 'G-NH2S1GEN8H'
    },
    async redirects() {
        return [
            {
                source: '/dojo',
                destination: '/programs/dojo',
                permanent: true,
            },
        ]
    },
};
