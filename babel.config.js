// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Requis pour expo-router v6
      //require.resolve('expo-router/babel'),
      // IMPORTANT : doit être le DERNIER plugin
      'react-native-worklets/plugin',
    ],
  };
};
