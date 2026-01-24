// ./src/sanity/lib/client.ts
import { createClient } from '@sanity/client'
import { cacheTag, cacheLife } from 'next/cache'


export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION,
  useCdn: true,
  perspective: 'published',
})


/**
 * Get all posts
 * @returns all posts
 */

export async function getPosts() {
    "use cache"

    cacheTag(`get-posts`)
    cacheLife('hours')

    return await sanityClient.fetch(`*[_type == "post"]{
        title,
        slug,
        _updatedAt
    }`)
}



/**
 * write a GROQ query to get the latest 3 posts
 * @returns latest 3 posts
 */

export async function getLatestPosts({ start = 0, end = 3 }) {
    "use cache"

    cacheTag(`latest-posts`)
    cacheLife('hours')

    return await sanityClient.fetch(`
        *[_type == "post"] | order(publishedAt desc){ 
            title,
            slug,
            publishedAt,
            "mainImage": mainImage.asset->url,
            "author": author->name

        }[${start}...${end}]
    `)
}



/**
 * write a GROQ query to get a single post by slug
 * @param {string} slug 
 * @returns a single post by slug
 */

export async function getPostBySlug(slug) {
    "use cache"

    cacheTag(`post-${slug}`)
    cacheLife('hours')

    return await sanityClient.fetch(`
        *[_type == "post" && slug.current == $slug][0]{
            title,
            categories,
            _updatedAt,
            publishedAt,
            "mainImage": mainImage.asset->url,
            "mainImageCaption": mainImage.caption,
            "mainImageAlt": mainImage.alt,
            "author": author->name,
            body,
        }
    `, { slug })
}