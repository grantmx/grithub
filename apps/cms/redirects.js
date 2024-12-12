const redirects = async () => {
  const internetExplorerRedirect = {
    destination: '/ie-incompatible.html',
    has: [
      {
        type: 'header',
        key: 'user-agent',
        value: '(.*Trident.*)', // all ie browsers
      },
    ],
    permanent: false,
    source: '/:path((?!ie-incompatible.html$).*)', // all pages except the incompatibility page
  }

  const admin = {
      source: '/',
      destination: '/admin',
      permanent: true,
  }

  const redirects = [
    admin,
    internetExplorerRedirect
  ]

  return redirects
}

export default redirects
