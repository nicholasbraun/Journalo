// Expo SDK 56 auto-configures Metro for the monorepo (watching the root and
// resolving hoisted/symlinked workspaces), so we start from getDefaultConfig and
// only add what Metro can't do on its own.
//
// The one thing it can't: @journal/core is authored as ESM TypeScript with explicit
// ".js" import specifiers (e.g. `import { fold } from "./fold.js"`). core's tsc
// (moduleResolution "Bundler") and Vitest both map those specifiers onto the ".ts"
// sources; Metro takes ".js" literally and fails because only ".ts" exists. We map
// relative ".js" specifiers back to their ".ts" source for Metro, delegating
// everything else to the default resolver — which leaves core untouched (the
// core/mobile boundary stays one-way) and preserves Expo's monorepo config.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isRelative = moduleName.startsWith('./') || moduleName.startsWith('../');
  if (isRelative && moduleName.endsWith('.js')) {
    try {
      // Prefer the TypeScript source the ".js" specifier actually refers to.
      return context.resolveRequest(
        context,
        `${moduleName.slice(0, -'.js'.length)}.ts`,
        platform,
      );
    } catch {
      // A genuine ".js" file (or no ".ts" sibling): fall through to the default.
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
