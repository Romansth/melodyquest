module.exports = {
    rootDir: __dirname,
    transform: {
      '^.+\\.jsx?$': 'babel-jest',
    },
    "moduleNameMapper": {
        "^axios$": "axios/dist/node/axios.cjs"
      }
  };
  