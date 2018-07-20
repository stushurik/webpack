const path = require("path");
const fs = require("fs");
const ts = require("typescript");

const override = process.argv.includes("--override");
const doWrite = process.argv.includes("--write");

async function run() {
	const rootPath = path.resolve(__dirname, "..");
	const libPath = path.resolve(__dirname, "../lib");
	const configPath = path.resolve(__dirname, "../tsconfig.json");
	const configContent = fs.readFileSync(configPath, "utf-8");
	const configJsonFile = ts.parseJsonText(configPath, configContent);
	const parsedConfig = ts.parseJsonSourceFileConfigFileContent(
		configJsonFile,
		ts.sys,
		rootPath,
		{ noEmit: true }
	);
	const { fileNames, options } = parsedConfig;

	const program = ts.createProgram(fileNames, options);

	const typeChecker = program.getTypeChecker();

	/**
	 *
	 * @param {ts.ClassDeclaration} node
	 * @returns {Set<ts.ClassDeclaration>}
	 */
	const getBaseClasses = node => {
		/** @type {Set<ts.ClassDeclaration>} */
		const decls = new Set();
		if (node.heritageClauses) {
			for (const clause of node.heritageClauses) {
				for (const clauseType of clause.types) {
					const type = typeChecker.getTypeAtLocation(clauseType);
					if (ts.isClassDeclaration(type.symbol.valueDeclaration))
						decls.add(type.symbol.valueDeclaration);
				}
			}
		}
		return decls;
	};
	/**
	 * @param {ts.ClassDeclaration} classNode
	 * @param {string} memberName
	 * @returns {ts.MethodDeclaration | null}
	 */
	const findDeclarationInBaseClass = (classNode, memberName) => {
		for (const baseClass of getBaseClasses(classNode)) {
			for (const node of baseClass.members) {
				if (ts.isMethodDeclaration(node)) {
					if (node.name.getText() === memberName) {
						return node;
					}
				}
			}
			const result = findDeclarationInBaseClass(baseClass, memberName);
			if (result) return result;
		}
		return null;
	};
	for (const sourceFile of program.getSourceFiles()) {
		let file = sourceFile.fileName;
		if (
			file.toLowerCase().startsWith(libPath.replace(/\\/g, "/").toLowerCase())
		) {
			const updates = [];
			sourceFile.forEachChild(node => {
				if (ts.isClassDeclaration(node)) {
					for (const member of node.members) {
						if (ts.isMethodDeclaration(member)) {
							const baseDecl = findDeclarationInBaseClass(
								node,
								member.name.getText()
							);
							if (baseDecl) {
								const memberAsAny = /** @type {any} */ (member);
								const baseDeclAsAny = /** @type {any} */ (baseDecl);
								const currentJsDoc = memberAsAny.jsDoc && memberAsAny.jsDoc[0];
								const baseJsDoc = baseDeclAsAny.jsDoc && baseDeclAsAny.jsDoc[0];
								const currentJsDocText = currentJsDoc && currentJsDoc.getText();
								let baseJsDocText = baseJsDoc && baseJsDoc.getText();
								if (baseJsDocText) {
									baseJsDocText = baseJsDocText.replace(
										/\t \* @abstract\r?\n/g,
										""
									);
									if (!currentJsDocText) {
										// add js doc
										updates.push({
											start: member.getStart(),
											end: member.getStart(),
											content: baseJsDocText + "\n\t"
										});
									} else if (
										baseJsDocText &&
										currentJsDocText !== baseJsDocText
									) {
										// update js doc
										if (override) {
											updates.push({
												start: currentJsDoc.getStart(),
												end: currentJsDoc.getEnd(),
												content: baseJsDocText
											});
										} else {
											updates.push({
												start: currentJsDoc.getStart() - 1,
												end: currentJsDoc.getEnd(),
												content: `<<<<<<< original comment\n\t${currentJsDocText}\n=======\n\t${baseJsDocText}\n>>>>>>> comment from base class`
											});
										}
									}
								}
							}
						}
					}
				}
			});
			if (updates.length > 0) {
				if(doWrite) {
					let fileContent = fs.readFileSync(file, "utf-8");
					updates.sort((a, b) => {
						return b.start - a.start;
					});
					for (const update of updates) {
						fileContent =
							fileContent.substr(0, update.start) +
							update.content +
							fileContent.substr(update.end);
					}
					console.log(`${file} ${updates.length} JSDoc comments added/updated`);
					fs.writeFileSync(file, fileContent, "utf-8");
				} else {
					console.log(file);
				}
				process.exitCode = 1;
			}
		}
	}
}

run();
