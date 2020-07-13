# gatsby-wpgraphql-inline-images

Forked version to support `gatsby-source-wordpress`.

example config

```js
{
  resolve: 'gatsby-wordpress-source-inline-images',
  options: {
    wordPressUrl: 'https://mydomain.com/',
    uploadsUrl: 'https://mydomain.com/wp-content/uploads/',
    processPostTypes: ['PAGE', 'POST'],
    graphqlTypeName: 'wordpress',
  },
},
```

For more info, please read original [documentation](https://github.com/progital/gatsby-wpgraphql-inline-images).

Note: ignore official docs for the following options:

```js
{
  processPostTypes: ['PAGE', 'POST'],
  graphqlTypeName: 'wordpress',
}
```
