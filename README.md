# html-template-convertor

A lightweight Node.js-based tool to generate static HTML files from templates.

※ このリポジトリのコードの多くは、生成AI（Gemini等）を使用して作成・支援されています。

## 🚀 特徴
- **JSONC 設定**: コメントを記述できる JSON (JSONC) を使用した柔軟な設定。
- **テンプレートエンジン**: シンプルな置換タグによる HTML テンプレートシステム。
- **動的ビルド**: 設定ファイルに基づき、複数のページを自動的に生成。
- **タイムスタンプ付き出力**: ビルドごとに一意のディレクトリに結果を出力。

## 🛠 前提条件
- Node.js (LTS 推奨)
- npm

## 📦 必須モジュール等のインストール
```bash
npm install
```

## 🚀 使用方法
`bin/convert.sh` を使用して、ターゲットを指定して実行します。

```bash
npm run convert <target_name>
```

例: `sample` ターゲットをビルドする場合
```bash
npm run convert sample
```

## 📂 ディレクトリ構成
```text
.
├── asset/              # クライアントサイドのアセット (JS, CSS等)
├── bin/                # ビルド用スクリプト (convert.js, convert.sh)
├── build/              # ビルド成果物の格納先 (用途に応じて使用)、ビルド時に自動生成
├── etc/                # 設定ファイル (JSONC形式)
│   ├── config.jsonc    # グローバル設定
│   └── {target}.jsonc  # ターゲットごとのビルド指示
├── template/           # HTMLテンプレートのソースコード
│   └── {target}/       # ターゲットごとのテンプレートパーツ
│       └── base.html   # テンプレートのベースファイル
├── tmp/                # ビルドされたHTMLの一時出力先 (タイムスタンプ付き)、ビルド時に自動生成
└── tests/              # テストコード
```

## 📁 ディレクトリ詳細
- **bin/**: `convert.js` が変換処理を提供します。
- **etc/**: `config.jsonc` で全体設定を、各ターゲット用の `.jsonc` ファイルでページ構成を定義します。
- **template/**: 各ターゲットのテンプレートパーツ（`base.html`, `header.html` 等）を格納します。
- **tmp/**: ビルド実行のたびに `tmp/{target}_{timestamp}/` という形式で出力されます。

## ⚙️ 設定ファイル

### `etc/config.jsonc` (グローバル設定)
プロジェクト全体の動作を制御します。

| プロパティ | 型 | 説明 | デフォルト |
| :--- | :--- | :--- | :--- |
| `encode` | string | ファイルのエンコーディング | `utf8` |
| `directoryIndex` | string | 生成されるHTMLのファイル名 | `index.html` |
| `remove` | boolean |`true` の場合、改行・タブを削除。 | `false` |
| `replace.tabs` | array | 出力ディレクトリ名。 | `[]` |
| `replace.active.mark` | boolean | 出力ディレクトリ名。 | `false` |
| `replace.active.replace` | string |  | `active` |

### `etc/{target}.jsonc` (ターゲット別設定)
特定のテンプレートセットに関する詳細なビルド指示。

| プロパティ | 型 | 説明 | デフォルト |
| :--- | :--- | :--- | :--- |
| `{page}` | string | ページ識別子。 |  |
| `{page}.dir` | string | 対象template内ディレクトリ指定。 | `{page}` |
| `{page}.uri` | string | URLパス（`dir` の代わりに使用可能）。 | `{page}` |
| `{page}.swapbase` | boolean | `true` の場合、`template/base.html`ではなく指定されたディレクトリの `{page}.dir/base.html` を使用。 | `false` |
| `{page}.partsswap` | array | グローバル設定の`replace.tabs`のパーツを`{page}.dir/{xxx}.html`に差替える場合に使用。 | `[]` |
| `{page}.replace.tag` | string | `#part#`に対する`{part_name}`の指定。 | `[]` |
| `{page}.replace.type` | string | 置換データの指定。 | `[raw\|dom]` |
| `{page}.replace.raw` | string | 無変換データ。そのまま変換します。  |  |
| `{page}.replace.dom` | object | DOM情報 |  |
| `{page}.replace.dom.tagname` | string | タグ名 |  |
| `{page}.replace.dom.attribute` | object | 属性 |  |

## 📝 テンプレート構文
HTML 内に以下の形式のタグを記述することで、指定したパーツファイルを挿入できます。

1. ベースタグ
part_nameはconfig.jsonc[replace.tabs]で指定できます。
```html
<!--[[Template #base# {part_name}]]-->
```

例: `header.html` を挿入する場合
```html
<!--[[Template #base# header]]-->
```

2. パートタグ
part_nameは{target}.jsoncで指定できます。
```html
<!--[[Template #part# {part_name}]]-->
```

例: `{page}.replace.tag`が`css`のパートタグを`{page}.replace.[dom|raw]`の値に変換する場合
```html
<!--[[Template #part# css]]-->
```

2. アクティブタグ
part_nameは{target}.jsoncで指定できます。
```html
<!--[[Template #active# {part_name}]]-->
```

例: ページ識別子`{page}`を`replace.active.replace`の値に変換する場合
```html
<!--[[Template #active# {page}]]-->
```

---

## 🧪 ユニットテストの実行

ビルドシステムの動作を検証するためのユニットテストが `tests/convert.test.js` に用意されています。

### テスト実行コマンド

Node.js 標準のテストランナーを使用して実行します（外部ライブラリのインストールは不要です）。

```bash
# 全ユニットテストの実行
node --test tests/*.test.js

# sample 画面専用ユニットテストの実行
node --test tests/sample_build.test.js

# 基本機能のユニットテスト
node --test tests/convert.test.js
```
