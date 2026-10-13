const path = require('path');
const { getDefaultConfig } = require('@react-native/metro-config');
const { getConfig } = require('react-native-builder-bob/metro-config');
const pkg = require('../package.json');

const root = path.resolve(__dirname, '..');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);
const config = getConfig(defaultConfig, {
  root,
  pkg,
  project: __dirname,
});
const { blacklistRE, ...resolver } = config.resolver;

module.exports = {
  ...config,
  resolver: {
    ...resolver,
    blockList: [defaultConfig.resolver.blockList, blacklistRE],
  },
};
