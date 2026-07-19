const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    functions: './src/functions/functions.ts',
    taskpane: './src/taskpane/taskpane.ts'
  },
  output: {
    filename: '[name].js',
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
        { from: 'public', to: '../dist' },
        { from: 'src/functions/functions.json', to: '../dist/functions.json' },
        { from: 'manifest.xml', to: '../dist' }
      ]
    })
  ]
};
