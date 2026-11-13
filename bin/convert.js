import { parseArgs } from 'node:util';
import fs from 'fs';
import path from 'path';
import { parse } from 'jsonc-parser';
import { JSDOM } from 'jsdom';

try {
	// シェルスクリプトから渡された引数を取得
	const [nodePath, thisFilePath] = process.argv;
	console.info('Process Arguments:', process.argv);

	const __dirname = path.dirname(thisFilePath);
	const basePath = path.resolve(__dirname, '..');

	const options = {
		// 値をとらないフラグ（例: -d または --debug）
		debug: {
			type: 'boolean',
			short: 'd',
			default: false,
		},
		// 値をとるオプション（例: -p 8080 または --port 8080）
		conf: {
			type: 'string',
			short: 'c',
			default: './etc',
		},
		asset: {
			type: 'string',
			short: 'a',
			default: './asset',
		},
		template: {
			type: 'string',
			short: 't',
			default: './template',
		}
	};
	const { values, positionals } = parseArgs({ options, allowPositionals: true });
	const _debug = values.debug;
	const target = positionals[0];
	if (!target) {
		throw new Error(`Target argument is required. (e.g., npm run convert -- user)'`);
	}
	console.info('Args Options:', values);
	console.info('target:', target);
	const confDir = path.resolve(basePath, values.conf);
	const assetDir = path.resolve(basePath, values.asset);
	const templateDir = path.resolve(basePath, values.template, target);
	const buildDir = path.join(basePath, 'build');
	const ts = new Date().toLocaleString('sv-SE').replace(/[- :]/g, '');
	const tmpPath = path.join(basePath, 'tmp', `${target}_${ts}`);

	// 変換アプリの設定ファイルを読み込む
	const configPath = path.join(confDir, 'convert.config.jsonc');
	if (!fs.existsSync(configPath)) {
		throw new Error(`Not Found Converter config file: ${configPath}`);
	}
	const configRaw = fs.readFileSync(configPath, 'utf8');
	const config = parse(configRaw);
	_debug && console.info('Config:', config);

	// テンプレート設定ファイルを読み込む
	const tplConfigPath = path.join(confDir, `${target}.jsonc`);
	if (!fs.existsSync(tplConfigPath)) {
		throw new Error(`Not Found Target config file: ${tplConfigPath}`);
	}
	const tplConfigRaw = fs.readFileSync(tplConfigPath, 'utf8');
	const pages = parse(tplConfigRaw);
	_debug && console.info('Pages Config:', pages);

	const encode = config?.encode || 'utf8';
	const directoryIndex = config.directoryIndex || 'index.html';

	// 1行の安全読み込み関数を定義
	const safeRead = (p) => {
		try {
			return fs.readFileSync(p, encode);
		} catch (e) {
			return '';
		}
	};

	const dom = new JSDOM(`<!DOCTYPE html> <html><body></body></html>`);
	const document = dom.window.document;

	// Baseファイルを読み込む
	const templateBase = safeRead(path.join(templateDir, 'base.html'));

	// 置換データ読込
	const parts = {};
	if (Array.isArray(config.replace.tags)) {
		config.replace.tags.forEach(tag => {
			const file = path.join(templateDir, `${tag}.html`);
			_debug && console.info(`Replace Base Tag File: ${file}`);
			parts[tag] = safeRead(file);
		});
	}
	else {
		config.replace.tags = [];
	}

	_debug && console.info(`Started each page task.`);
	Object.keys(pages).forEach(key => {
		const pageConf = pages[key];
		if (!pageConf) return;

		const pageDir = typeof pageConf.dir === 'string' ? pageConf.dir : key;
		let outputHtml = null;

		if (pageConf.baseswap === true) {
			const file = path.join(templateDir, pageDir, `base.html`);
			_debug && console.info(`Replace Base File: ${file}`);
			outputHtml = safeRead(file);
		}
		else {
			outputHtml = templateBase;
		}

		let outputPageDir = typeof pageConf.uri === 'string' ? pageConf.uri : key;
		//outputPageDir = `${tmpPath}/${outputPageDir}/`.replace(/\/+/g, '/');
		outputPageDir = path.join(tmpPath, outputPageDir);
		const outputFilePath = path.join(outputPageDir, directoryIndex);

		// 個別指定置換データ読込
		const replaceParts = { ...parts };
		if (Array.isArray(pageConf.partsswap)) {
			pageConf.partsswap.forEach(partName => {
				const file = path.join(templateDir, pageDir, `${partName}.html`);
				_debug && console.info(`Replace Base Tag Swap File: ${file}`);
				replaceParts[partName] = safeRead(file);
			});
		}
		console.info(replaceParts);

		// ベースHTML内パーツ置換処理
		Object.keys(replaceParts).forEach(tagName => {
			const tag = `<!--[[Template #base# ${tagName}]]-->`;
			_debug && console.info(`Replace Base Tag: ${tag}`);
			outputHtml = outputHtml.replaceAll(tag, replaceParts[tagName]);
		});

		const removeBase = /<!--\[\[Template #base# [a-z0-9/ ]+\]\]-->/gi;
		outputHtml = outputHtml.replaceAll(removeBase, '');

		// ページ内個別データ置換処理
		if (Array.isArray(pageConf.replace)) {
			pageConf.replace.forEach(replace => {
				if (typeof replace.type === 'string') {
					const tag = `<!--[[Template #part# ${replace.tag}]]-->`;
					_debug && console.info(`Replace Part Tag: ${tag}`);
					switch (replace.type) {
						case 'raw':
							outputHtml = outputHtml.replaceAll(tag, replace?.raw ?? '');
							break;
						case 'dom':
							const d = replace.dom;
							if (d && d.tagname) {
								const t = document.createElement(d.tagname);
								if (d.attribute) {
									Object.keys(d.attribute).forEach(attr => {
										t.setAttribute(attr, d.attribute[attr]);
									});
								}
								outputHtml = outputHtml.replaceAll(tag, t.outerHTML);
							} else {
								outputHtml = outputHtml.replaceAll(tag, '');
							}
							break;
					}
				}
			});
		}

		const removePart = /<!--\[\[Template #part# [a-z0-9/ ]+\]\]-->/gi;
		outputHtml = outputHtml.replaceAll(removePart, '');

		// active処理
		if (config.replace?.active?.mark === true) {
			const tagName = `<!--[[Template #active# ${key}]]-->`;
			_debug && console.info(`Replace Active Tag: ${tagName}`);
			const replace = config.replace?.active?.replace ?? 'active';
			outputHtml = outputHtml.replaceAll(tagName, replace);
		}

		const removeActive = /<!--\[\[Template #active# [a-z0-9/ ]+\]\]-->/gi;
		outputHtml = outputHtml.replaceAll(removeActive, '');

		// 改行・タブ除去処理
		if (config?.remove === true) {
			outputHtml = outputHtml.replaceAll(/[\r\n\t]/g, '');
			_debug && console.info(`Replace newline and tab successlull`);
		}
		console.info(outputHtml);

		// ディレクトリ作成
		if (!fs.existsSync(outputPageDir)) {
			fs.mkdirSync(outputPageDir, { recursive: true });
			_debug && console.log(`📁 Make directory successfull: ${outputPageDir}`);
		}

		// HTMLファイル保存
		fs.writeFileSync(outputFilePath, outputHtml, encode);
		console.log(`✅ Converted: ${outputFilePath}`);
	});

	// ビルドディレクトリ内データを削除
	if (fs.existsSync(buildDir)) {
		fs.rmSync(buildDir, {
			recursive: true,
			force: true,
		});
	}

	// assetディレクトリ内のファイルをビルドディレクトリにコピー
	if (fs.existsSync(assetDir)) {
		fs.cpSync(assetDir, tmpPath, {
			recursive: true,
			force: true,
		});
	}

	// tmpディレクトリの中身をビルドディレクトリにコピー
	if (fs.existsSync(tmpPath)) {
		fs.cpSync(tmpPath, buildDir, {
			recursive: true,
			force: true,
		});
	}
	console.log(`✅ Build finished: ${buildDir}`);
	console.log(`✅ Task successful.`);
}
catch (error) {
	console.error('❌ Error:', error.message);
	console.error(error);
	process.exit(1);
}
