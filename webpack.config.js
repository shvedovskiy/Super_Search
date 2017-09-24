const path = require('path');
const Uglify = require('uglifyjs-webpack-plugin');
const autoprefixer = require('autoprefixer');

module.exports = {
	entry: './src/scripts/app',

	output: {
		path: path.resolve(__dirname, 'public/dist'),
		filename: 'bundle.js',
	},

	module: {
		rules: [{
			test: /\.js$/,
			exclude: /node_modules/,
			use: [
				{
					loader: 'babel-loader',
					options: {
						presets: ['env']
					}
				}
			]
		},]
	},

	plugins: [
		new Uglify()
	]
};