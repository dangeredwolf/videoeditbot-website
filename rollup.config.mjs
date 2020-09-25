import resolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import babel from "@rollup/plugin-babel";
import { terser } from "rollup-plugin-terser";


export default {
	input: "./src/app.js",
	preserveModules: false,
	output: {
		file: "./content/app.js",
		format: "es",
		sourcemap: true,
		hoistTransitiveImports: true
	},
	plugins: [
		resolve(),
		json(),
		babel({configFile:"./babel.json"}),
		terser({mangle:false})
	]
};
