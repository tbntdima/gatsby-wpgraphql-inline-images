const sourceParser = require('./sourceParser')
const debugLog = require('./utils').debugLog

const findExistingNode = (slug, allNodes) =>
  allNodes.find((node) => node.sourceUri === slug)

const postsBeingParsed = new Map()

module.exports = async function createResolvers(params, pluginOptions) {
  const contentNodeType = 'ParsedWordPressContent'
  const {
    createResolvers,
    createNodeId,
    createContentDigest,
    getNodesByType,
  } = params
  const {
    actions: { createNode },
  } = params
  const {
    processPostTypes = [],
    customTypeRegistrations = [],
    debugOutput = false,
    keyExtractor = (source, context, info) => source.slug,
  } = pluginOptions

  const logger = (...args) => {
    args.unshift('>>>')
    debugLog(debugOutput, ...args)
  }

  // `content` field Resolver
  // - passes content to sourceParser
  // - saves (caches) the result to a `ParsedWordPressContent` node
  // - repeat request for the same content (determined by slug) returns cached result
  const contentResolver = async (source, args, context, info) => {
    // const { slug, path } = source;
    let slug = keyExtractor(source, context, info)
    let parsedContent = ''
    logger('Entered contentResolver @', slug || 'URI not defined, skipping')
    let content = source[info.fieldName]

    // slug works as a key for caching/processing functions
    // bails if no slug
    if (!slug) {
      return content
    }

    // if a node with a given URI exists
    const cached = findExistingNode(slug, getNodesByType(contentNodeType))
    // returns content from that node
    if (cached) {
      logger('node already created:', slug)
      return cached.parsedContent
    }

    // returns promise
    if (postsBeingParsed.has(slug)) {
      logger('node is already being parsed:', slug)
      return postsBeingParsed.get(slug)
    }

    const parsing = (async () => {
      try {
        logger('will start parsing:', slug)
        parsedContent = await sourceParser(
          { content },
          pluginOptions,
          params,
          context
        )
        return parsedContent
      } catch (e) {
        logger(`Failed sourceParser at ${slug}`, e)
        return content
      }
    })()

    postsBeingParsed.set(slug, parsing)

    return parsing
  }

  processPostTypes.forEach((element) => {
    let params = {}
    params[`${pluginOptions.graphqlTypeName}__${element}`] = {
      content: {
        resolve: contentResolver,
      },
    }
    logger('Registering ', `${pluginOptions.graphqlTypeName}_${element}`)

    createResolvers(params)
  })
  customTypeRegistrations.forEach((registration) => {
    let params = {}
    params[registration.graphqlTypeName] = {
      [registration.fieldName]: {
        resolve: contentResolver,
      },
    }
    logger('Registering custom resolver ', registration.graphqlTypeName)

    createResolvers(params)
  })
}
