import { parse } from 'jsonc-parser';
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
const document = dom.window.document;

try {
	// シェルスクリプトから渡された引数を取得
	const [nodePath, thisFilePath, target] = process.argv;
	console.info('Arguments:', process.argv);

	const __dirname = path.dirname(thisFilePath);
	const basePath = path.resolve(__dirname, '..');

	// 変換アプリの設定ファイルを読み込む
	const configPath = `${basePath}/etc/config.jsonc`;
	if (!fs.existsSync(configPath)) {
		throw new Error(`設定ファイルが見つかりません: ${configPath}`);
	}
	const configRaw = fs.readFileSync(configPath, 'utf8');
	const config = parse(configRaw);
	console.info('Config:', config);

	// テンプレート設定ファイルを読み込む
	const tplConfigPath = `${basePath}/etc/${target}.jsonc`;
	if (!fs.existsSync(tplConfigPath)) {
		throw new Error(`テンプレート設定ファイルが見つかりません: ${tplConfigPath}`);
	}
	const tplConfigRaw = fs.readFileSync(tplConfigPath, 'utf8');
	const pages = parse(tplConfigRaw);
	console.info('Pages Config:', pages);

	const ts = new Date().toLocaleString('sv-SE').replace(/[- :]/g, '');
	const tmpPath = `${basePath}/tmp/${target}_${ts}/`;
	const assetPath = `${basePath}/asset/`;
	const buildPath = `${basePath}/build/`;

	const encode = config?.encode || 'utf8';
	const directoryIndex = config.directoryIndex || 'index.html';

	// 1行の安全読み込み関数を定義
	const safeRead = (p) => {
		try {
			console.info(`Read File Path: ${p}`);
			return fs.readFileSync(p, encode);
		} catch (e) {
			return '';
		}
	};

	// ファイルを読み込む
	const templatePath = `${basePath}/template/${target}/`;
	const templateBase = safeRead(`${templatePath}base.html`);

	// 置換データ読込
	const parts = {};
	if (Array.isArray(config.replace.tags)) {
		config.replace.tags.forEach(tag => {
			parts[tag] = safeRead(`${templatePath}${tag}.html`);
		});
	}
	else {
		config.replace.tags = [];
	}

	Object.keys(pages).forEach(key => {
		const pageConf = pages[key];
		if (!pageConf) return;

		const pageDir = typeof pageConf.dir === 'string' ? pageConf.dir : key;
		let outputHtml = null;

		if (pageConf.baseswap === true) {
			const path = `${templatePath}${pageDir}/base.html`;
			const base = safeRead(path);
			outputHtml = base;
		}
		else {
			outputHtml = templateBase;
		}

		let outputPageDir = typeof pageConf.uri === 'string' ? pageConf.uri : key;
		outputPageDir = `${tmpPath}${outputPageDir}/`.replace('//', '/');
		const outputFilePath = `${outputPageDir}${directoryIndex}`;

		// 個別指定置換データ読込
		const replaceParts = { ...parts };
		if (Array.isArray(pageConf.partsswap)) {
			pageConf.partsswap.forEach(partName => {
				if (config.replace.tags.includes(partName)) {
					const path = `${templatePath}${pageDir}/${partName}.html`;
					replaceParts[partName] = safeRead(path);
				}
			});
		}

		// ベースHTML内パーツ置換処理
		Object.keys(replaceParts).forEach(tagName => {
			const tag = `<!--[[Template #base# ${tagName}]]-->`;
			console.info(`Replace Base Tag: ${tagName}`);
			outputHtml = outputHtml.replaceAll(tag, replaceParts[tagName]);
		});

		const removeBase = /<!--\[\[Template #base# [a-z0-9/ ]+\]\]-->/gi;
		outputHtml = outputHtml.replaceAll(removeBase, '');

		// ページ内個別データ置換処理
		if (Array.isArray(pageConf.replace)) {
			pageConf.replace.forEach(replace => {
				if (typeof replace.type === 'string') {
					const tag = `<!--[[Template #part# ${replace.tag}]]-->`;
					console.info(`Replace Part Tag: ${replace.tag}`);
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
			console.info(`Replace Active Tag: ${tagName}`);
			const replace = config.replace?.active?.replace ?? 'active';
			outputHtml = outputHtml.replaceAll(tagName, replace);
		}

		const removeActive = /<!--\[\[Template #active# [a-z0-9/ ]+\]\]-->/gi;
		outputHtml = outputHtml.replaceAll(removeActive, '');

		// 改行・タブ除去処理
		if (config?.remove === true) {
			console.info(`Replace newline tab`);
			outputHtml = outputHtml.replaceAll(/[\r\n\t]/g, '');
		}

		// ディレクトリ作成
		if (!fs.existsSync(outputPageDir)) {
			fs.mkdirSync(outputPageDir, { recursive: true });
			console.log(`📁 ディレクトリを作成しました: ${outputPageDir}`);
		}

		// HTMLファイル保存
		fs.writeFileSync(outputFilePath, outputHtml, encode);
		console.log(`✅ コンバート完了: ${outputFilePath}`);
	});

	// ビルドディレクトリ内データを削除
	if (fs.existsSync(buildPath)) {
		fs.rmSync(buildPath, {
			recursive: true,
			force: true,
		});
	}

	// assetディレクトリ内のファイルをビルドディレクトリにコピー
	if (fs.existsSync(assetPath)) {
		fs.cpSync(assetPath, tmpPath, {
			recursive: true,
			force: true,
		});
	}

	// tmpディレクトリの中身をビルドディレクトリにコピー
	if (fs.existsSync(tmpPath)) {
		fs.cpSync(tmpPath, buildPath, {
			recursive: true,
			force: true,
		});
	}
	console.log(`✅ ビルド終了: ${buildPath}`);
	console.log(`✅ Task successful.`);
}
catch (error) {
	console.error('❌ エラーが発生しました:', error.message);
	console.error(error);
	process.exit(1);
}
