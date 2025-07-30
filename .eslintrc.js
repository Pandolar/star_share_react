module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  env: {
    browser: true,
    es6: true,
    node: true
  },
  rules: {
    // 可以在这里添加自定义规则
    'no-unused-vars': 'warn',
    'no-console': 'warn'
  }
};