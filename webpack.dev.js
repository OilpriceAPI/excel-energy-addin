const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const fs = require('fs');
const os = require('os');

const certPath = path.join(os.homedir(), '.office-addin-dev-certs');

module.exports = {
  entry: './src/index.ts',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'ExcelEnergyAddin',
    libraryTarget: 'window',
    clean: true
  },
  mode: 'development',
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'public', to: '.' },
        { from: 'manifest.xml', to: '.' }
      ]
    })
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist')
    },
    host: '0.0.0.0',
    port: 3000,
    hot: false,
    liveReload: false,
    server: {
      type: 'https',
      options: {
        key: fs.readFileSync(path.join(certPath, 'localhost.key')),
        cert: fs.readFileSync(path.join(certPath, 'localhost.crt')),
        ca: fs.readFileSync(path.join(certPath, 'ca.crt'))
      }
    },
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    allowedHosts: 'all'
  }
};
