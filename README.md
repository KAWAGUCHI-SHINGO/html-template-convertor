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

### コマンドオプション
| オプション | 短縮形 | デフォルト値 | 説明 |
| :--- | :--- | :--- | :--- |
| `--conf` | `-c` | ./etc | 設定ファイルが格納されているディレクトリを指定します。 |
| `--asset` | `-a` | ./asset | アセットファイルが格納されているディレクトリを指定します。 |
| `--template` | `-t` | ./template | テンプレートファイルが格納されているディレクトリを指定します。 |
| `--debug` | `-d` | false | 	デバッグモードを有効にします。 |

### 実行例
```bash
npm run convert -- [オプション] {target_name}
```

例: リポジトリ内にある`sample` ターゲットをビルドする場合
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
│   ├── convert.config.jsonc # グローバル設定
│   └── {target}.jsonc  # ターゲットごとのビルド指示
├── template/           # HTMLテンプレートのソースコード
│   └── {target}/       # ターゲットごとのテンプレートパーツ
│       └── base.html   # テンプレートのベースファイル
├── tmp/                # ビルドされたHTMLの一時出力先 (タイムスタンプ付き)、ビルド時に自動生成
└── tests/              # テストコード
```

## 📁 ディレクトリ詳細
- **asset/**: 変換後のHTMLから利用するJS,CSS等を格納します。コマンド実行時のオプション指定により変更できます。
- **bin/**: `convert.js` が変換処理を提供します。
- **etc/**: `convert.config.jsonc` で全体設定を、各ターゲット用の `{target}.jsonc` ファイルでページ構成を定義します。コマンド実行時のオプション指定により変更できます。
- **template/**: 各ターゲットのテンプレートパーツ（`base.html`, `header.html` 等）を格納します。コマンド実行時のオプション指定により変更できます。
- **tmp/**: ビルド実行のたびに `tmp/{target}_{timestamp}/` という形式で出力されます。

## ⚙️ 設定ファイル

### `etc/config.jsonc` (グローバル設定)
プロジェクト全体の動作を制御します。

| プロパティ | 型 | 説明 | デフォルト |
| :--- | :--- | :--- | :--- |
| `encode` | string | ファイルのエンコーディング | `utf8` |
| `directoryIndex` | string | 生成されるHTMLのファイル名 | `index.html` |
| `remove` | boolean |`true` の場合、改行・タブを削除 | `false` |
| `replace.tabs` | array | ベースタグとして使用するHTMLファイル名のリスト | `[]` |
| `replace.active.mark` | boolean | `true` の場合、アクティブタグを置換する | `false` |
| `replace.active.replace` | string | アクティブタグの置換後の文字列 | `active` |

### `etc/{target}.jsonc` (ターゲット別設定)
特定のテンプレートセットに関する詳細なビルド指示。

| プロパティ | 型 | 説明 | デフォルト |
| :--- | :--- | :--- | :--- |
| `{page}` | string | ページ識別子 |  |
| `{page}.dir` | string | 対象template内ディレクトリ指定 | `{page}` |
| `{page}.uri` | string | URLパス（`dir` の代わりに使用可能） | `{page}` |
| `{page}.swapbase` | boolean | `true` の場合、`template/base.html`ではなく指定されたディレクトリの `{page}.dir/base.html` を使用。 | `false` |
| `{page}.partsswap` | array | グローバル設定の`replace.tabs`のパーツを`{page}.dir/{xxx}.html`に差替える場合に使用 | `[]` |
| `{page}.replace` | array | ページ内での個別置換設定 | `[]` |
| `{page}.replace.tag` | string | `#part#`に対する`{part_name}`の指定 |  |
| `{page}.replace.type` | string | 置換データの指定 (raw または dom) |  |
| `{page}.replace.raw` | string | `type: 'raw'` の場合、そのまま出力する文字列  |  |
| `{page}.replace.dom` | object | `type: 'dom'` の場合、DOM要素の定義 |  |
| `{page}.replace.dom.tagname` | string | タグ名 |  |
| `{page}.replace.dom.attribute` | object | 属性の定義 (key: value) |  |

## 📝 テンプレート構文
HTML 内に以下の形式のタグを記述することで、指定したパーツファイルを挿入できます。

1. ベースタグ `convert.config.jsonc` の `replace.tags` に含まれる名前を使用します。
```html
<!--[[Template #base# {part_name}]]-->
```

例: `header.html` を挿入する場合
```html
<!--[[Template #base# header]]-->
```

2. パートタグ `{target}.jsonc` の `replace` 配列内の `tag` プロパティで指定した名前を使用します。
part_nameは{target}.jsoncで指定できます。
```html
<!--[[Template #part# {replace_tag}]]-->
```

例: `{page}.replace.tag`が`css`の場合
```html
<!--[[Template #part# css]]-->
```

2. アクティブタグ {target}.jsonc で定義されているページ識別子を使用します。
```html
<!--[[Template #active# {page_id}]]-->
```

例: ページ識別子`home`を置換する場合
```html
<!--[[Template #active# home]]-->
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
