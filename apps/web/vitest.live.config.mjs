import config from './vitest.config.mjs';

export default {
  ...config,
  test: {
    ...config.test,
    include: ['tests/**/*.live.tsx'],
    testTimeout: 15000,
    hookTimeout: 15000,
    fileParallelism: false,
  },
};
