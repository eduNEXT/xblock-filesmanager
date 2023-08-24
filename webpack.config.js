const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const BundleTracker = require('webpack-bundle-tracker');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
  context: __dirname,
  entry: {
    FilesManagerXBlock: path.resolve(__dirname, "filesmanager", "static", "js", "src", "filesmanager.js")
  },
  output: {
    path: path.resolve(__dirname, "filesmanager", "static", "html"),
    libraryTarget: 'window',
    filename: '[name]-[hash].js'
  },
  module: {
    rules: [
      {
        test: /\.(js|ts)x?$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.html$/,
        use: {
          loader: "html-loader",
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "index.html")
    }),
    /* new WebpackManifestPlugin({
      seed: {
        base_url: path.resolve(__dirname, "filesmanager", "static", "html"),
      }
    }) */,
    new BundleTracker({
      path: path.join(__dirname, 'filesmanager', "static"),
      filename: 'webpack-stats.json',
    }),
    new CleanWebpackPlugin()
  ],
  resolve: {
    modules: [path.resolve(__dirname, "src"), "node_modules"],
    extensions: [".js", ".jsx", ".tsx", ".ts"]
  }
};
