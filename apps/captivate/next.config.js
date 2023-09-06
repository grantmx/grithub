
const withPWA = require('next-pwa')({
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
    register: true,
})

const NextConfig = {
    reactStrictMode: true,
    transpilePackages: ["ui"],
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
        return []
    },
    async headers() {
        return []
    }
};


module.exports = withPWA(NextConfig)