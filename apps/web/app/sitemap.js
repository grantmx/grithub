import { getPosts } from "services/sanity/sanity.service";


export default async function sitemap() {
    const allPosts = await getPosts()

    const newsRoomFeed = allPosts.map(post => {
        return {
            url: `${process.env.NEXT_PUBLIC_url}/newsroom/${post.slug.current}`,
            lastModified: post._updatedAt,
            changeFrequency: 'weekly',
            priority: 1,
        }
    })
    
    return[
        {
            url: process.env.NEXT_PUBLIC_url,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 1,
        },
        {
            url: `${process.env.NEXT_PUBLIC_url}/programs`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${process.env.NEXT_PUBLIC_url}/programs/dojo`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.7,
        },
        {
            url: `${process.env.NEXT_PUBLIC_url}/programs/incubation`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.7,
        },
        {
            url: `${process.env.NEXT_PUBLIC_url}/programs/internship`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.7,
        },
        {
            url: `${process.env.NEXT_PUBLIC_url}/about`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.7,
        },
        {
            url: `${process.env.NEXT_PUBLIC_url}/contact`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.7,
        },
        {
            url: `${process.env.NEXT_PUBLIC_url}/consulting`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.7,
        },
        {
            url: `${process.env.NEXT_PUBLIC_url}/cowork`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.7,
        },
        {
            url: `${process.env.NEXT_PUBLIC_url}/media-kit`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.7,
        },
        {
            url: `${process.env.NEXT_PUBLIC_url}/privacy`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.7,
        },
        {
            url: `${process.env.NEXT_PUBLIC_url}/terms`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.7,
        },
        {
            url: `${process.env.NEXT_PUBLIC_url}/newsroom`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 1,
        },
        ...newsRoomFeed
    ]
}