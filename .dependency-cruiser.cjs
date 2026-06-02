// Enforces the one-way dependency rule from ARCHITECTURE.md:
//   mobile -> core  (allowed)
//   core   -> mobile / platform code  (FORBIDDEN, fails loudly)
//
// Run with: npm run lint:deps  (which runs `depcruise core`)
// This guards the *module-graph* direction. The complementary guard against
// platform globals (window/document/fetch) lives in core/tsconfig.json, which
// omits the "DOM" lib so those become compile errors.
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "core-no-platform-deps",
      comment:
        "@journal/core is platform-agnostic: it must not import React, React Native, Expo, or any platform UI runtime.",
      severity: "error",
      from: { path: "^core/" },
      to: {
        path:
          "node_modules/(react|react-dom|react-native|react-native-[^/]+|expo|expo-[^/]+|@expo/|@react-native/|@react-navigation/)",
      },
    },
    {
      name: "core-no-mobile-imports",
      comment:
        "@journal/core must never import from the mobile shell — the dependency direction is mobile -> core only.",
      severity: "error",
      from: { path: "^core/" },
      to: { path: "^mobile/" },
    },
    {
      name: "no-circular",
      comment: "Circular dependencies make the fold/event model hard to reason about.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    // tsPreCompilationDeps so type-only imports (e.g. `import type` of a
    // platform package) are also caught, not just runtime imports.
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
    },
  },
};
