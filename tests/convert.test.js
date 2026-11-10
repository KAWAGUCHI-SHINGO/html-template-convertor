/**
 * @file convert.test.js
 * @description bin/convert.js のビルドプロセスを検証するためのユニットテストです。
 * 
 * 【実行方法】
 * 以下のコマンドを実行してテストを実行します（外部ライブラリは不要です）。
 * $ node --test tests/convert.test.js
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('child_process');

test('HTMLビルドシステムの実行テスト（userターゲット）', (t) => {
	const basePath = path.resolve(__dirname, '..');
	const target = 'user';

	// テスト実行前の var ディレクトリ一覧を取得
	const varDir = path.join(basePath, 'var');
	const beforeDirs = fs.existsSync(varDir) ? fs.readdirSync(varDir) : [];

	// ビルドスクリプトを実行
	// 例: node bin/convert.js <basePath> <target>
	const cmd = `node "${path.join(basePath, 'bin/convert.js')}" "${basePath}" "${target}"`;
	
	try {
		console.log(`実行コマンド: ${cmd}`);
		execSync(cmd, { stdio: 'pipe' });
	} catch (error) {
		assert.fail(`ビルドスクリプトの実行に失敗しました: ${error.message}`);
	}

	// テスト実行後の var ディレクトリ一覧を取得
	const afterDirs = fs.readdirSync(varDir);

	// 新しく作成されたディレクトリを特定
	const newDirs = afterDirs.filter(d => !beforeDirs.includes(d) && d.startsWith(`${target}_`));
	assert.ok(newDirs.length > 0, '新しく生成されたビルドディレクトリが存在しません。');

	// 最新のディレクトリパスを取得
	newDirs.sort();
	const latestDirName = newDirs[newDirs.length - 1];
	const latestDir = path.join(varDir, latestDirName);

	// 設定ファイル(etc/user.json)のキーに対応するHTMLが生成されているか検証
	// user.json には "", "config", "log", "mypage", "signin", "signup" があるため、それぞれのフォルダ配下の index.html の存在を確認
	const expectedSubDirs = ['', 'config', 'log', 'mypage', 'signin', 'signup'];

	for (const subDir of expectedSubDirs) {
		// 空文字は '!' に変換されて出力される (convert.js の 28行目: const dirname = key === '' ? '!' : key;)
		const expectedPath = subDir === '' 
			? path.join(latestDir, '!', 'index.html') 
			: path.join(latestDir, subDir, 'index.html');

		assert.ok(fs.existsSync(expectedPath), `期待されるHTMLファイルが生成されていません: ${expectedPath}`);

		// 生成されたHTMLの中身が1行に軽量化（Minify）されているか（改行が含まれていないか）検証
		const content = fs.readFileSync(expectedPath, 'utf8');
		assert.ok(!content.includes('\n'), `${expectedPath} に改行文字が含まれています。`);
		assert.ok(!content.includes('\r'), `${expectedPath} にキャリッジリターンが含まれています。`);
	}

	console.log('✅ ターゲット [user] のテストにパスしました。すべての期待されるHTMLファイルが正しく生成されました。');
});

test('HTMLビルドシステムの実行テスト（contractターゲット）', (t) => {
	const basePath = path.resolve(__dirname, '..');
	const target = 'contract';

	// テスト実行前の var ディレクトリ一覧を取得
	const varDir = path.join(basePath, 'var');
	const beforeDirs = fs.existsSync(varDir) ? fs.readdirSync(varDir) : [];

	// ビルドスクリプトを実行
	const cmd = `node "${path.join(basePath, 'bin/convert.js')}" "${basePath}" "${target}"`;
	
	try {
		console.log(`実行コマンド: ${cmd}`);
		execSync(cmd, { stdio: 'pipe' });
	} catch (error) {
		assert.fail(`ビルドスクリプトの実行に失敗しました: ${error.message}`);
	}

	// テスト実行後の var ディレクトリ一覧を取得
	const afterDirs = fs.readdirSync(varDir);

	// 新しく作成されたディレクトリを特定
	const newDirs = afterDirs.filter(d => !beforeDirs.includes(d) && d.startsWith(`${target}_`));
	assert.ok(newDirs.length > 0, '新しく生成されたビルドディレクトリが存在しません。');

	// 最新のディレクトリパスを取得
	newDirs.sort();
	const latestDirName = newDirs[newDirs.length - 1];
	const latestDir = path.join(varDir, latestDirName);

	// 設定ファイル(etc/contract.json)のキーに対応するHTMLが生成されているか検証
	const expectedSubDirs = ['', 'analytics', 'billing', 'config', 'contract', 'log', 'payment', 'signin', 'signup', 'subscriber'];

	for (const subDir of expectedSubDirs) {
		// 空文字は '!' に変換されて出力される
		const expectedPath = subDir === '' 
			? path.join(latestDir, '!', 'index.html') 
			: path.join(latestDir, subDir, 'index.html');

		assert.ok(fs.existsSync(expectedPath), `期待されるHTMLファイルが生成されていません: ${expectedPath}`);

		// 生成されたHTMLの中身が1行に軽量化（Minify）されているか（改行が含まれていないか）検証
		const content = fs.readFileSync(expectedPath, 'utf8');
		assert.ok(!content.includes('\n'), `${expectedPath} に改行文字が含まれています。`);
		assert.ok(!content.includes('\r'), `${expectedPath} にキャリッジリターンが含まれています。`);
	}

	console.log('✅ ターゲット [contract] のテストにパスしました。すべての期待されるHTMLファイルが正しく生成されました。');
});

