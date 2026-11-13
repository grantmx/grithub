import {defineType, defineArrayMember, defineField} from 'sanity'

/**
 * This is the schema definition for the rich text fields used for
 * for this blog studio. When you import it in schemas.js it can be
 * reused in other parts of the studio with:
 *  {
 *    name: 'someName',
 *    title: 'Some title',
 *    type: 'blockContent'
 *  }
 */




export default defineType({
  title: 'Block Content',
  name: 'blockContent',
  type: 'array',
  of: [
    defineArrayMember({
      title: 'Block',
      type: 'block',
      // Styles let you set what your user can mark up blocks with. These
      // correspond with HTML tags, but you can set any title or value
      // you want and decide how you want to deal with it where you want to
      // use your content.
      styles: [
        {title: 'Normal', value: 'normal'},
        {title: 'H1', value: 'h1'},
        {title: 'H2', value: 'h2'},
        {title: 'H3', value: 'h3'},
        {title: 'H4', value: 'h4'},
        {title: 'H5', value: 'h5'},
        {title: 'H6', value: 'h6'},
        {title: 'Quote', value: 'blockquote'},
      ],
      lists: [
        {title: 'Bullet', value: 'bullet'},
        {title: 'Numbered', value: 'number'},
      ],
      // Marks let you mark up inline text in the block editor.
      marks: {
        // Decorators usually describe a single property – e.g. a typographic
        // preference or highlighting by editors.
        decorators: [
          {title: 'Strong', value: 'strong'},
          {title: 'Emphasis', value: 'em'},
          {title: 'Code', value: 'code'},
          {
            title: 'HR', 
            value: 'hr',
            icon: () => '—',
            component: () => "******************************"
          },
          { title: "Underline", "value": "underline" },
          { title: "Strike", "value": "strike-through" }
        ],
        // Annotations can be any object structure – e.g. a link or a footnote.
        annotations: [
          defineArrayMember({
            title: 'URL',
            name: 'link',
            type: 'object',
            fields: [
              defineField({
                name: 'href',
                type: 'url',
                title: 'URL',
                description: 'Full URL (https://…), a site path (/programs), mailto: or tel:.',
                validation: (Rule) =>
                  Rule.required().uri({
                    scheme: ['http', 'https', 'mailto', 'tel'],
                    allowRelative: true,
                  }),
              }),
            ],
          }),
        ],
      },
    }),
    // You can add additional types here. Note that you can't use
    // primitive types such as 'string' and 'number' in the same array
    // as a block type.
    defineArrayMember({
      type: 'image',
      options: {hotspot: true},
      fieldsets: [
        {
          name: 'linkSettings',
          title: 'Link',
          description: 'Optional: make the image clickable.',
          options: {collapsible: true, collapsed: false},
        },
      ],
      fields: [
        defineField({
          name: 'alt',
          type: 'string',
          title: 'Alternative Text',
          description: 'Describe the image for screen readers and search engines.',
          validation: (Rule) =>
            Rule.warning().custom((alt) => (alt ? true : 'Alt text is recommended for accessibility')),
        }),
        defineField({
          name: 'caption',
          type: 'string',
          title: 'Image Caption',
        }),
        defineField({
          name: 'size',
          type: 'string',
          title: 'Display Size',
          initialValue: 'full',
          options: {
            list: [
              {title: 'Full width', value: 'full'},
              {title: 'Medium', value: 'medium'},
              {title: 'Small', value: 'small'},
            ],
            layout: 'radio',
            direction: 'horizontal',
          },
        }),
        defineField({
          name: 'link',
          type: 'url',
          title: 'Link URL',
          description: 'Full URL (https://…), a site path (/programs), mailto: or tel:.',
          fieldset: 'linkSettings',
          validation: (Rule) =>
            Rule.uri({scheme: ['http', 'https', 'mailto', 'tel'], allowRelative: true}),
        }),
        defineField({
          name: 'openInNewTab',
          type: 'boolean',
          title: 'Open in a new tab',
          description: 'Links to other websites open in a new tab by default.',
          fieldset: 'linkSettings',
          hidden: ({parent}) => !parent?.link,
        }),
      ],
      preview: {
        select: {media: 'asset', alt: 'alt', caption: 'caption', link: 'link', size: 'size'},
        prepare({media, alt, caption, link, size}) {
          const details = [size && size !== 'full' ? size : null, link ? `→ ${link}` : null]
          return {
            media,
            title: caption || alt || 'Image',
            subtitle: details.filter(Boolean).join(' · ') || undefined,
          }
        },
      },
    }),

  ],
})
