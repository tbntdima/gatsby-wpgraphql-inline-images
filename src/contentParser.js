/** @jsx jsx */
import { jsx } from 'theme-ui'
import getByPath from 'lodash/get'
import { Link } from 'gatsby'
import Img from 'gatsby-image'
import parser, { domToReact } from 'html-react-parser'
import { Styled } from 'theme-ui'
import URIParser from 'urijs'

/**
 * swaps external URLs in <a> and <img> elements if they were downloaded and are available locally
 * returns React elements
 * @param  {string} content             post content
 * @param  {string} wordPressUrl        wordpress uploads url
 * @param  {string} uploadsUrl          wordpress site url
 * @return {React}                      React elements
 *
 * contentParser(content, pluginOptions)
 */
export default function contentParser(
  { content },
  { wordPressUrl, uploadsUrl }
) {
  if (typeof content === 'undefined') {
    console.log(
      'ERROR: contentParser requires content parameter to be string but got undefined.'
    )
  }

  if (typeof content !== 'string') {
    return content
  }

  const subdirectoryCorrection = (path, wordPressUrl) => {
    const wordPressUrlParsed = new URIParser(wordPressUrl)
    // detect if WordPress is installed in subdirectory
    const subdir = wordPressUrlParsed.path()
    return path.replace(subdir, '/')
  }

  const parserOptions = {
    replace: (domNode) => {
      if (typeof window !== 'undefined' && domNode.type === 'script') {
        const src = domNode.attribs['data-postponed-src']
        if (!document.getElementById(src)) {
          const script = document.createElement('script')
          script.src = src
          script.setAttribute('id', src)
          script.setAttribute('async', '')
          script.onload = function () {
            // document
            //   .querySelectorAll('.instagram-media-registered')
            //   .forEach((igContainer) => {
            //     igContainer.className = 'instagram-media'
            //     igContainer.removeAttribute('id')
            //   })
            console.log('external script loaded', domNode)
          }
          setTimeout(() => {
            document.head.appendChild(script)
          }, 200)
        }
        return <span></span>
      }

      let elementUrl =
        (domNode.name === 'a' && domNode.attribs.href) ||
        (domNode.name === 'img' && domNode.attribs.src) ||
        null

      if (!elementUrl) {
        return
      }

      let urlParsed = new URIParser(elementUrl)

      // TODO test if this hash handling is sufficient
      if (elementUrl === urlParsed.hash()) {
        return
      }

      // handling relative url
      const isUrlRelative = urlParsed.is('relative')

      if (isUrlRelative) {
        urlParsed = urlParsed.absoluteTo(wordPressUrl)
        elementUrl = urlParsed.href()
      }

      // removes protocol to handle mixed content in a page
      let elementUrlNoProtocol = elementUrl.replace(/^https?:/i, '')
      let uploadsUrlNoProtocol = uploadsUrl.replace(/^https?:/i, '')
      let wordPressUrlNoProtocol = wordPressUrl.replace(/^https?:/i, '')

      let className = getByPath(domNode, 'attribs.class', '')
      // links to local files have this attribute set in sourceParser
      let wasLinkProcessed = getByPath(
        domNode,
        'attribs[data-gts-swapped-href]',
        null
      )

      // replaces local links with <Link> element
      if (
        domNode.name === 'a' &&
        !wasLinkProcessed &&
        elementUrlNoProtocol.includes(wordPressUrlNoProtocol) &&
        !elementUrlNoProtocol.includes(uploadsUrlNoProtocol)
      ) {
        let url = urlParsed.path()
        url = subdirectoryCorrection(url, wordPressUrl)
        return (
          <Styled.a as={Link} to={url} className={className}>
            {domToReact(domNode.children, parserOptions)}
          </Styled.a>
        )
      }

      // cleans up internal processing attribute
      if (wasLinkProcessed) {
        delete domNode.attribs['data-gts-swapped-href']
      }

      // data passed from sourceParser
      const fluidData =
        domNode.name === 'img' &&
        getByPath(domNode, 'attribs[data-gts-encfluid]', null)

      if (fluidData) {
        const fluidDataParsed = JSON.parse(fluidData)

        let altText = getByPath(domNode, 'attribs.alt', '')
        let imageTitle = getByPath(domNode, 'attribs.title', null)

        if (imageTitle && !altText) {
          altText = imageTitle
        }

        // respects original "width" attribute
        // sets width accordingly
        let extraSx = {}
        if (
          domNode.attribs.width &&
          !Number.isNaN(Number.parseInt(domNode.attribs.width, 10))
        ) {
          extraSx.maxWidth = `${domNode.attribs.width}px`
        }

        return (
          <Img
            sx={{
              variant: 'styles.SourcedImage',
              width: '100%',
              height: 'auto',
              mx: 'auto',
              ...extraSx,
            }}
            fluid={fluidDataParsed}
            className={className}
            alt={altText}
            title={imageTitle}
          />
        )
      }
    },
  }

  // todo replace all selfclosing with closing
  const fixedContent = content
    .replace(/<iframe[\s\S]+?\/>/g, (m) => {
      return m.substring(0, m.length - 2).concat('></iframe>')
    })
    .replace(/<script[\s\S]+?\/>/g, (m) => {
      return m.substring(0, m.length - 2).concat('></script>')
    })
    .replace(/<div[\s\S]+?\/>/g, (m) => {
      return m.substring(0, m.length - 2).concat('></div>')
    })
    .replace(/<span[\s\S]+?\/>/g, (m) => {
      return m.substring(0, m.length - 2).concat('></span>')
    })

  return parser(fixedContent, parserOptions)
}
