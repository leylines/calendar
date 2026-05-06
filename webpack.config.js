const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const WebpackPwaManifest = require('webpack-pwa-manifest');
const { GenerateSW } = require('workbox-webpack-plugin');
const seoConfig = require('./seo.config.js');

module.exports = {
  mode: 'development',
  entry: './src/script.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'docs'),
    clean: true,
    publicPath: '',
  },
  devtool: 'source-map',
  devServer: {
    static: './docs',
    port: 8080,
    hot: true,
    open: true,
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  require('@tailwindcss/postcss')(),
                ],
              },
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      templateParameters: { 
        seo: seoConfig,
        buildTime: new Date().toLocaleString('de-CH', { timeZone: 'Europe/Zurich' })
      },
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'public', to: '', noErrorOnMissing: true },
      ],
    }),
    new WebpackPwaManifest({
      name: seoConfig.title,
      short_name: '13M Kalender',
      description: seoConfig.description,
      background_color: seoConfig.themeColor,
      theme_color: seoConfig.themeColor,
      crossorigin: 'use-credentials', // can be null, use-credentials or anonymous
      display_override: ['window-controls-overlay', 'standalone'],
      protocol_handlers: [
        {
          protocol: 'web+calendar',
          url: '/?date=%s'
        }
      ],
      icons: [
        {
          src: path.resolve('public/leylines-sign.png'),
          sizes: [96, 128, 192, 256, 384, 512],
          destination: path.join('icons')
        }
      ],
      screenshots: [
        {
          src: path.resolve('/screenshot-desktop.png'),
          sizes: '361x640',
          type: 'image/png',
          form_factor: 'wide',
          label: 'Desktop-Ansicht des 13-Monate Kalenders'
        },
        {
          src: path.resolve('/screenshot-mobile.png'),
          sizes: '1500x1832',
          type: 'image/png',
          label: 'Mobile-Ansicht des 13-Monate Kalenders'
        }
      ]
    }),
    new GenerateSW({
      clientsClaim: true,
      skipWaiting: true,
      maximumFileSizeToCacheInBytes: 5000000, // To handle large deps locally
      exclude: [/\.DS_Store$/, /^CNAME$/]
    })
  ],
};
