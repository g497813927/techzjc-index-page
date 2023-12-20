const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const VueLoaderPlugin = require('vue-loader').VueLoaderPlugin;
const vuePlugin = new VueLoaderPlugin();
const htmlPlugin = new HtmlWebpackPlugin({
    template: './index.html',
    filename: 'index.html',
    inject: true,
    chunks: ['main']
});
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
// Compress the output
const CompressionPlugin = require('compression-webpack-plugin');

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
                test: /\.js$/,
                loader: 'babel-loader',
                exclude: /node_modules/
            },
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
            'vue': '@vue/runtime-dom',
            '@': path.resolve(__dirname, 'src')
        }
    },
    plugins: [
        vuePlugin,
        htmlPlugin,
        new HtmlWebpackPlugin({
            template: './index.html',
            filename: 'index.html',
            inject: true,
            chunks: ['main']
        }),
        new MiniCssExtractPlugin({
            filename: '[name].[hash:8].css',
            chunkFilename: '[name].[hash:8].css'
        }),
        new CleanWebpackPlugin(),
        new BundleAnalyzerPlugin(),
        new CompressionPlugin({
            deleteOriginalAssets: false,
            algorithm: 'gzip',
            test: /.(js|css|svg)$/,
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
                    chunks: 'all',
                    test: /[\\/]node_modules[\\/]/,
                    // cacheGroupKey here is `commons` as the key of the cacheGroup
                    name(module, chunks, cacheGroupKey) {
                        const moduleFileName = module
                            .identifier()
                            .split('/')
                            .reduceRight((item) => item);
                        const allChunksNames = chunks.map((item) => item.name).join('~');
                        return `${cacheGroupKey}-${allChunksNames}-${moduleFileName}`;
                    },
                    priority: 10,
                    reuseExistingChunk: true,
                },
                // Split each vue component into a separate chunk
                vueComponents: {
                    chunks: "all",
                    test: /[\\/]src[\\/]components[\\/]/,
                    name(module, chunks, cacheGroupKey) {
                        const moduleFileName = module
                            .identifier()
                            .split('/')
                            .reduceRight((item) => item);
                        const allChunksNames = chunks.map((item) => item.name).join('~');
                        return `${cacheGroupKey}-${allChunksNames}-${moduleFileName}`;
                    },
                    priority: 5,
                    reuseExistingChunk: true,
                },
                default: {
                    minChunks: 2,
                    priority: -20,
                    reuseExistingChunk: true,
                },

                chunks: 'all',
            },
        },
    }
};