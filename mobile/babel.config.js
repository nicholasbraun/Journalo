// expo-router requires an explicit Babel config. babel-preset-expo carries the
// router transform in SDK 56 (the standalone `expo-router/babel` plugin is gone),
// so the preset alone is the whole config — no extra plugins needed here.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
