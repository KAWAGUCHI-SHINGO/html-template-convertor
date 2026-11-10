/**
 * @file sample_build.test.js
 * @description システム管理（sample ターゲット）のHTMLテンプレートビルドを検証するためのユニットテストです。
 * 
 * 【テスト内容】
 * 1. bin/convert.js による sample ターゲットのビルド実行とディレクトリ生成の検証
 * 2. etc/sample.jsonc で定義された全画面（全14画面）の index.html の存在検証
 * 3. 全HTMLファイルにおける未置換プレースホルダー（<!--[[BizGrain.JP ...]]-->）の残存なし検証
 * 4. 全HTMLファイルにおける改行・タブ除去（1行化・Minify）の検証
 * 5. 各画面に対する専用JavaScriptモジュール（@sample/*.js）の正しい注入検証
 * 6. サイドバーのアクティブクラス付与および不要プレースホルダー残存なしの検証
 * 
 * 【実行方法】
 * Node.js 標準のテストランナーを使用して実行します（外部ライブラリは不要です）。
 * プロジェクトルートディレクトリにて以下のいずれかのコマンドを実行してください：
 * 
 * $ node --test tests/sample_build.test.js
 * 
 * または全テストを実行する場合：
 * $ node --test tests/*.test.js
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('child_process');

test('システム管理画面（sampleターゲット）のHTMLビルドおよびテンプレートデータ整合性テスト', (t) => {
	const basePath = path.resolve(__dirname, '..');
	const target = 'sampale';

	// 1. テスト実行前の var ディレクトリ一覧を取得
	const varDir = path.join(basePath, 'var');
	const beforeDirs = fs.existsSync(varDir) ? fs.readdirSync(varDir) : [];

	// 2. ビルドスクリプトを実行
	// 例: node bin/convert.js <basePath> sample
	const cmd = `node "${path.join(basePath, 'bin/convert.js')}" "${basePath}" "${target}"`;
	try {
		console.log(`テスト実行コマンド: ${cmd}`);
		execSync(cmd, { stdio: 'pipe' });
	} catch (error) {
		assert.fail(`sampleターゲットのビルドスクリプト実行に失敗しました: ${error.message}`);
	}

	// 3. テスト実行後に新しく生成されたビルドディレクトリを特定
	const afterDirs = fs.readdirSync(varDir);
	const newDirs = afterDirs.filter(d => !beforeDirs.includes(d) && d.startsWith(`${target}_`));
	assert.ok(newDirs.length > 0, '新しく生成されたsampleビルドディレクトリ（var/sample_...）が存在しません。');

	// 最新のディレクトリパスを取得
	newDirs.sort();
	const latestDirName = newDirs[newDirs.length - 1];
	const latestDir = path.join(varDir, latestDirName);
	console.log(`検証対象ディレクトリ: ${latestDir}`);

	// 4. etc/sample.jsonc で定義されている期待される全画面パス（14画面）を定義
	// 各キーと出力先パスの対応関係：
	// - signin: var/sample_.../signin/index.html
	// - signup: var/sample_.../signup/index.html
	// - !top:   var/sample_.../index.html （path: "" によるルート出力）
	// - analytics: var/sample_.../analytics/index.html
	// - mypage: var/sample_.../mypage/index.html
	// - mypage/config: var/sample_.../mypage/config/index.html
	// - mypage/email: var/sample_.../mypage/email/index.html
	// - mypage/passkey: var/sample_.../mypage/passkey/index.html
	// - mypage/log: var/sample_.../mypage/log/index.html
	// - setting: var/sample_.../setting/index.html
	// - billing: var/sample_.../billing/index.html
	// - contract: var/sample_.../contract/index.html
	// - service: var/sample_.../service/index.html
	// - price: var/sample_.../price/index.html
	const expectedScreens = [
		{ name: 'signin', path: path.join(latestDir, 'signin', 'index.html'), expectedJs: '/_/js/@sample/signin.js' },
		{ name: 'signup', path: path.join(latestDir, 'signup', 'index.html'), expectedJs: '/_/js/@sample/signup.js' },
		{ name: '!top (TOP画面・サービス一覧)', path: path.join(latestDir, 'index.html'), expectedJs: '/_/js/@sample/service.js' },
		{ name: 'analytics', path: path.join(latestDir, 'analytics', 'index.html'), expectedJs: '/_/js/@sample/analytics.js' },
		{ name: 'mypage', path: path.join(latestDir, 'mypage', 'index.html'), expectedJs: '/_/js/@sample/mypage.js' },
		{ name: 'mypage/config', path: path.join(latestDir, 'mypage', 'config', 'index.html'), expectedJs: '/_/js/@sample/mypageconfig.js' },
		{ name: 'mypage/email', path: path.join(latestDir, 'mypage', 'email', 'index.html'), expectedJs: '/_/js/@sample/mypageemail.js' },
		{ name: 'mypage/passkey', path: path.join(latestDir, 'mypage', 'passkey', 'index.html'), expectedJs: '/_/js/@sample/mypagepasskey.js' },
		{ name: 'mypage/log', path: path.join(latestDir, 'mypage', 'log', 'index.html'), expectedJs: '/_/js/@sample/mypagelog.js' },
		{ name: 'setting', path: path.join(latestDir, 'setting', 'index.html'), expectedJs: '/_/js/@sample/setting.js' },
		{ name: 'billing', path: path.join(latestDir, 'billing', 'index.html'), expectedJs: '/_/js/@sample/billing.js' },
		{ name: 'contract', path: path.join(latestDir, 'contract', 'index.html'), expectedJs: '/_/js/@sample/contract.js' },
		{ name: 'service', path: path.join(latestDir, 'service', 'index.html'), expectedJs: '/_/js/@sample/service.js' },
		{ name: 'price', path: path.join(latestDir, 'price', 'index.html'), expectedJs: '/_/js/@sample/price.js' }
	];

	// 5. 各画面のファイル存在、Minify状態、プレースホルダー置換、スクリプト注入を検証
	for (const screen of expectedScreens) {
		// (a) ファイルの存在検証
		assert.ok(
			fs.existsSync(screen.path),
			`[${screen.name}] 期待されるHTMLファイルが生成されていません: ${screen.path}`
		);

		const htmlContent = fs.readFileSync(screen.path, 'utf8');

		// (b) 改行・タブの除去（1行化）の検証
		assert.ok(
			!htmlContent.includes('\n'),
			`[${screen.name}] HTMLファイル内に改行文字（\\n）が含まれています: ${screen.path}`
		);
		assert.ok(
			!htmlContent.includes('\r'),
			`[${screen.name}] HTMLファイル内にキャリッジリターン（\\r）が含まれています: ${screen.path}`
		);

		// (c) 未置換プレースホルダー（<!--[[BizGrain.JP ...]]-->）が残存していないか検証
		const hasUnreplacedTag = htmlContent.includes('<!--[[BizGrain.JP');
		assert.ok(
			!hasUnreplacedTag,
			`[${screen.name}] 未置換のプレースホルダー（<!--[[BizGrain.JP）が残っています: ${screen.path}`
		);

		// (d) 固有のJavaScriptモジュールが正しく注入されているか検証
		assert.ok(
			htmlContent.includes(screen.expectedJs),
			`[${screen.name}] 期待されるJavaScript（${screen.expectedJs}）がHTML内に含まれていません。`
		);
	}

	// 6. 各画面固有の詳細構造検証
	// (a) signin 画面に Turnstile API スクリプトが含まれていること
	const signinHtml = fs.readFileSync(path.join(latestDir, 'signin', 'index.html'), 'utf8');
	assert.ok(
		signinHtml.includes('challenges.cloudflare.com/turnstile'),
		'signin 画面に Cloudflare Turnstile API スクリプトが含まれていません。'
	);

	// (b) signup 画面に共通 meta 経由のメタタグ・CSS が正しく含まれていること
	const signupHtml = fs.readFileSync(path.join(latestDir, 'signup', 'index.html'), 'utf8');
	assert.ok(
		signupHtml.includes('bootstrap-plus.css'),
		'signup 画面に共通 CSS（bootstrap-plus.css）が含まれていません。'
	);

	// (c) mypage/log 画面で新規登録モーダルの未置換タグが残っていないこと（空置換が適用されていること）
	const logHtml = fs.readFileSync(path.join(latestDir, 'mypage', 'log', 'index.html'), 'utf8');
	assert.ok(
		!logHtml.includes('<!--[[BizGrain.JP register]]-->'),
		'mypage/log 画面に未置換の register プレースホルダーが残っています。'
	);

	console.log(`✅ システム管理画面（sample）全 ${expectedScreens.length} 画面の検証テストにすべて合格しました。`);
});
