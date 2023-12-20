const path = require('path');
const {VueLoaderPlugin} = require('vue-loader')
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    mode: 'production',
    entry: './src/main.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].bundle.js',
        sourceMapFilename: '[name].[hash:8].map',
        chunkFilename: '[name].[hash:8].js'
    },
    module: {
        rules: [
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/i,
                type: 'asset/resource',
            },
            {
                test: /\.vue$/,
                loader: 'vue-loader'
            },
            {
                test: /\.css$/i,
                use: ["vue-style-loader", "css-loader"],
            },
        ]
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src')
        }
    },
    plugins: [
        // make sure to include the plugin for the magic
        new VueLoaderPlugin(),
        new HtmlWebpackPlugin({
            template: './index.html',
            filename: 'index.html',
            inject: true,
            chunks: ['main']
        })
    ],
    optimization: {
        splitChunks: {
            chunks: 'async',
            minSize: 20000,
            minRemainingSize: 0,
            minChunks: 1,
            maxAsyncRequests: 30,
            maxInitialRequests: 30,
            enforceSizeThreshold: 50000,
            cacheGroups: {
                // Split `node_modules` files.
                commons: {
                    chunks: 'initial',
                    minChunks: 2,
                    test: /[\\/]node_modules[\\/]/,
                    // cacheGroupKey here is `commons` as the key of the cacheGroup
                    name(module, chunks, cacheGroupKey) {
                        const moduleFileName = module
                            .identifier()
                            .split('/')
                            .reduceRight((item) => item);
                        const allChunksNames = chunks.map((item) => item.name).join('~');
                        return `${cacheGroupKey}-${allChunksNames}-${moduleFileName}`;
                    }
                },
                defaultVendors: {
                    test: /[\\/]node_modules[\\/]/,
                    priority: -10
                },
                chunks: 'all',
            },
        },
    }
};