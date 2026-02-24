const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configure transformer to handle source maps properly
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Block InternalBytecode.js from being resolved (this is a Metro symbolication issue)
// The InternalBytecode.js error occurs when Metro tries to symbolicate stack traces
// from native code but can't find the source file. This is a known Metro issue.
config.resolver.blockList = [
  /InternalBytecode\.js$/,
  /.*InternalBytecode\.js$/,
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : []),
];

// Also configure transformer to ignore InternalBytecode.js
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Disable source map symbolication for InternalBytecode.js to prevent errors
// This prevents Metro from trying to read the file during symbolication
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Skip symbolication requests for InternalBytecode.js
      if (req.url && req.url.includes('InternalBytecode.js')) {
        return res.status(404).end();
      }
      return middleware(req, res, next);
    };
  },
};

module.exports = config;

