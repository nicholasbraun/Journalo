// @journal/core — platform-agnostic domain package.
//
// Scaffolding only: no event types, fold, or domain rules yet (later sessions).
// This single trivial export exists purely to prove the workspace wiring —
// the mobile shell imports it to confirm `mobile -> @journal/core` resolves
// through both npm workspaces and Metro. Replace/remove once real code lands.
export const CORE_READY = true;
