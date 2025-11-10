module.exports = {
  presets: [
    'module:react-native-builder-bob/babel-preset',
    ['@babel/preset-typescript', { allowNamespaces: true, allowDeclareFields: true }],
    '@babel/preset-flow',
  ],
  env: {
    test: {
      presets: [
        ['@react-native/babel-preset'],
        ['@babel/preset-typescript', { allowNamespaces: true, allowDeclareFields: true }],
        '@babel/preset-flow',
      ],
    },
  },
};
