const base = require('./jest.config');
module.exports = {
  ...base,
  moduleNameMapper: { '^\\.\\./app$': '<rootDir>/original/app.buggy.js' }
};
