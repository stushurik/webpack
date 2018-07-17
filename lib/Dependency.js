/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const DependencyReference = require("./dependencies/DependencyReference");

/** @typedef {import("./Module")} Module */
/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates */
/** @typedef {import("./ModuleGraph")} ModuleGraph */
/** @typedef {import("./util/createHash").Hash} Hash */

/**
 * @typedef {Object} DependencyTemplateContext
 * @property {RuntimeTemplate} runtimeTemplate
 * @property {DependencyTemplates} dependencyTemplates
 */

/**
 * @typedef {Object} DependencyTemplate
 * @property {function(Dependency, Source, DependencyTemplateContext): void} apply
 */

/** @typedef {Object} SourcePosition
 *  @property {number} line
 *  @property {number=} column
 */

/** @typedef {Object} RealDependencyLocation
 *  @property {SourcePosition} start
 *  @property {SourcePosition=} end
 *  @property {number=} index
 */

/** @typedef {Object} SynteticDependencyLocation
 *  @property {string} name
 *  @property {number=} index
 */

/** @typedef {SynteticDependencyLocation|RealDependencyLocation} DependencyLocation */

/**
 * @typedef {Object} ExportsSpec
 * @property {string[] | true | null} exports exported names, true for unknown exports or null for no exports
 * @property {Module[]=} dependencies module on which the result depends on
 */

class Dependency {
	constructor() {
		/** @type {Module|null} */
		this.module = null;
		// TODO remove in webpack 5
		/** @type {boolean} */
		this.weak = false;
		/** @type {boolean} */
		this.optional = false;
		/** @type {DependencyLocation} */
		this.loc = undefined;
	}

	getResourceIdentifier() {
		return null;
	}

	// Returns the referenced module and export
	getReference() {
		if (!this.module) return null;
		return new DependencyReference(this.module, true, this.weak);
	}

	/**
	 * Returns the exported names
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {ExportsSpec | undefined} export names
	 */
	getExports(moduleGraph) {
		return undefined;
	}

	getWarnings() {
		return null;
	}

	getErrors() {
		return null;
	}

	/**
	 * Update the hash
	 * @param {Hash} hash hash to be updated
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {void}
	 */
	updateHash(hash, moduleGraph) {
		hash.update((this.module && this.module.id) + "");
	}

	disconnect() {
		this.module = null;
	}
}

module.exports = Dependency;
