
const NextConfig = {
    output: 'standalone',
    reactStrictMode: true,
    reactCompiler: true,
    cacheComponents: true,
    transpilePackages: [
        "ui",
        "next-mdx-remote"
    ],
    turbopack: {
        resolveAlias: {
            canvas: { browser: './empty-module.js' }, 
        },
    },
    serverExternalPackages: ['sharp'],
    pageExtensions: ['mdx', 'jsx', 'js'],
    env: {
        NEXT_PUBLIC_url: "https://grithub.org.za",
        NEXT_PUBLIC_GA_ID: 'G-NH2S1GEN8H'
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'cdn.sanity.io',
            },
        ],
        localPatterns: [
            {
                pathname: '/ads/**',
                search: '',
            },
            {
                pathname: '/assets/**',
                search: '',
            },
            {
                pathname: '/thirdparty/**',
                search: '',
            },
            {
                pathname: '/whitepapers/**',
                search: '',
            },
            
        ],
    },
    async redirects() {
        return [
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
            },
            {
                source: '/(.*)',
                headers: [
                  {
                    key: 'X-Content-Type-Options',
                    value: 'nosniff',
                  },
                  {
                    key: 'X-Frame-Options',
                    value: 'SAMEORIGIN',
                  },
                  {
                    key: 'Referrer-Policy',
                    value: 'no-referrer-when-downgrade'
                  },
                ],
            },
            {
                source: '/sw.js',
                headers: [
                    {
                        key: 'Content-Type',
                        value: 'application/javascript; charset=utf-8',
                    },
                    {
                        key: 'Cache-Control',
                        value: 'no-cache, no-store, must-revalidate',
                    },
                    {
                        key: 'Content-Security-Policy',
                        value: "default-src 'self'; script-src 'self'",
                    },
                ],
            },
        ]
    }
}

module.exports = NextConfig;