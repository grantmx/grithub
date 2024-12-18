// ./src/sanity/lib/client.ts
import { createClient } from '@sanity/client'

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

export async function getLatestPosts({ number = 3 }) {
    return await sanityClient.fetch(`
        *[_type == "post"] | order(publishedAt desc){ 
            title,
            slug,
            publishedAt,
            "mainImage": mainImage.asset->url,
            "author": author->name

        }[0...${number}]
    `)
}



/**
 * write a GROQ query to get a single post by slug
 * @param {string} slug 
 * @returns a single post by slug
 */

export async function getPostBySlug(slug) {
    return await sanityClient.fetch(`
        *[_type == "post" && slug.current == $slug][0]{
            title,
            categories,
            _updatedAt,
            publishedAt,
            "mainImage": mainImage.asset->url,
            "author": author->name,
            body,
        }
    `, { slug })
}