# mcp-rocm-static

ROCm / MIOpen コードベースに対する静的解析専用 MCP サーバー。

`rg` / `ctags` / `cscope` / `compile_commands.json` / `clang AST` を安全に呼び出すための
**読み取り専用の道具箱**として設計する。解釈や結論は人間が行う。

ソースツリーは read-only とし、**書き込みは MCP プロジェクト直下の `cacheDir` のみ**に限定する。
repo root や調査対象 clone へは書き込まない。

---

## 目的と位置づけ

このサーバーが担うのは次の4つに限定する。

1. ハブ関数・責務境界の特定
2. capability 判定と fallback 点の特定
3. component 間接続点の特定
4. 構造説明文書・Mermaid 図の根拠補強

**担わないこと**: 解釈・結論の自動生成、正本文書への直接出力。
解析結果は根拠候補として人間が確認し、最終文書への反映は手動で行う。

---

## ディレクトリ構成

```text
mcp-rocm-static/
├── README.md
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── doctor.ts
│   ├── tools/
│   │   ├── grep_code.ts
│   │   ├── find_symbols.ts
│   │   ├── build_ctags.ts
│   │   ├── query_ctags.ts
│   │   ├── build_cscope.ts
│   │   ├── query_cscope.ts
│   │   ├── find_compile_commands.ts
│   └── util/
│       ├── exec.ts
│       ├── fs.ts
│       └── repo.ts
└── config/
    └── rocm-static.json
```

現時点の実装は `find_compile_commands` までで、`ast_dump` / `collect_hub_points` は仕様を先に固定した未実装項目として扱う。

---

## 必要なツールと依存

### Node / npm 依存

- Node.js `>= 20`
- npm
- npm package:
  - `@modelcontextprotocol/sdk`
  - `typescript`
  - `@types/node`

初回セットアップ:

```bash
cd /home/limonene/ROCm-project/WD-Black/ROCm-Static_Analysis/MCP
npm install
npm run build
```

### コマンド依存

| コマンド | 必須度 | 用途 |
| --- | --- | --- |
| `rg` | 必須 | `grep_code`, `find_symbols`, `find_compile_commands`, `build_cscope` の入力列挙 |
| `ctags` | 推奨 | `build_ctags`, `query_ctags` |
| `cscope` | 任意 | `build_cscope`, `query_cscope` |
| `clang`, `clang++` | 任意 | `ast_dump` |

`ctags` / `cscope` / `clang` は未導入でもサーバー自体は起動できるが、対応ツールは `unavailable` あるいは未構成として返す。

### 環境確認

依存と root 状態は次で確認できる。

```bash
cd /home/limonene/ROCm-project/WD-Black/ROCm-Static_Analysis/MCP
npm run build
npm run doctor
```

`doctor` は次を表示する。

- コマンド依存の導入状態と version
- `repoAliases` に登録された root の存在確認
- 各 root 配下の `compile_commands.json` 件数

---

## 設定ファイル

### `config/rocm-static.json`

```json
{
  "name": "rocm-static-analysis",
  "version": "0.1.0",
  "roots": [
    "/home/limonene/ROCm-project/WD-Black/ROCm-repos/MIOpen",
    "/home/limonene/ROCm-project/WD-Black/ROCm-repos/rocMLIR",
    "/home/limonene/ROCm-project/WD-Black/ROCm-repos/rocm-systems",
    "/home/limonene/ROCm-project/WD-Black/ROCm-repos/TheRock",
    "/home/limonene/ROCm-project/WD-Black/ROCm-repos/rocBLAS",
    "/home/limonene/ROCm-project/WD-Black/ROCm-repos/Tensile"
  ],
  "repoAliases": {
    "miopen":       "/home/limonene/ROCm-project/WD-Black/ROCm-repos/MIOpen",
    "rocmlir":      "/home/limonene/ROCm-project/WD-Black/ROCm-repos/rocMLIR",
    "therock":      "/home/limonene/ROCm-project/WD-Black/ROCm-repos/TheRock",
    "rocblas":      "/home/limonene/ROCm-project/WD-Black/ROCm-repos/rocBLAS",
    "tensile":      "/home/limonene/ROCm-project/WD-Black/ROCm-repos/Tensile",
    "rocm-systems": "/home/limonene/ROCm-project/WD-Black/ROCm-repos/rocm-systems"
  },
  "repoMeta": {
    "miopen":       { "status": "active",            "role": "solver-selection" },
    "rocmlir":      { "status": "active",            "role": "mlir-backend" },
    "therock":      { "status": "active",            "role": "build-integration" },
    "rocblas":      { "status": "active",            "role": "gemm-backend" },
    "tensile":      { "status": "active",            "role": "gemm-codegen" },
    "rocm-systems": { "status": "active",            "role": "runtime-systems" },
    "llvm-project": { "status": "reference",         "role": "compiler-base" }
  },
  "tools": {
    "grep_code":             { "enabled": true, "maxResults": 200 },
    "find_symbols":          { "enabled": true },
    "build_ctags":           { "enabled": true, "output": "tags" },
    "query_ctags":           { "enabled": true },
    "build_cscope":          { "enabled": true, "output": "cscope.out" },
    "query_cscope":          { "enabled": true },
    "find_compile_commands": { "enabled": true },
    "ast_dump":              { "enabled": false, "maxFiles": 3, "requireCompileCommands": true },
    "collect_hub_points":    { "enabled": false }
  },
  "policies": {
    "allowWriteOutsideCache": false,
    "allowCacheWrite":        true,
    "cacheDir":               ".cache/mcp-rocm-static",
    "allowDelete":            false,
    "allowOutsideRoots":      false,
    "maxFileReadBytes":       262144
  },
  "scanPolicy": {
    "excludeDirs":   ["build", ".git", ".cache", "dist", "out", "third_party", "__pycache__"],
    "includeGlobs":  ["*.cpp", "*.hpp", "*.h", "*.c", "*.cc", "*.cmake", "CMakeLists.txt", "*.py", "*.rst", "*.yaml", "*.yml", "*.td"]
  },
  "defaults": {
    "preferredLanguages": ["cpp", "c", "cmake", "python", "rst", "yaml"],
    "hubFunctions": [
      "IsApplicable",
      "IsXdlopsSupport",
      "GetSolution",
      "FindCore",
      "SolverContainer",
      "miirCreateHandle",
      "MiirIsConfigApplicable",
      "RockEnabled",
      "CallHipBlas",
      "BuildCodeObjectInMemory",
      "parseConvConfig",
      "buildKernelPipeline",
      "isApplicable"
    ]
  }
}
```

`cacheDir` は **MCP プロジェクト root からの相対パス**として扱う。
build 系の生成物は `<MCP project>/<cacheDir>/<repoAlias>/...` 配下にのみ置く。

LLVM 系 clone を追加する場合は `roots` だけでなく `repoAliases` / `repoMeta` にも対応エントリを足す。
ただし全域解析は行わず、対象を `mlir/` / `mlir/lib/` / rocMLIR の Rock dialect 周辺に限定する。

```json
"/home/limonene/ROCm-project/WD-Black/ROCm-repos/llvm-project"
```

```json
"llvm-project": "/home/limonene/ROCm-project/WD-Black/ROCm-repos/llvm-project"
```

### MCP クライアント設定例（Claude Desktop / 汎用クライアント）

```json
{
  "mcpServers": {
    "rocm-static-analysis": {
      "command": "node",
      "args": [
        "/home/limonene/ROCm-project/WD-Black/ROCm-Static_Analysis/MCP/dist/index.js",
        "--config",
        "/home/limonene/ROCm-project/WD-Black/ROCm-Static_Analysis/MCP/config/rocm-static.json"
      ]
    }
  }
}
```

---

## ツール仕様

### 1. `grep_code` — コード全域の正規表現検索

```json
{
  "pattern": "IsApplicable|GetSolution|miirCreateHandle",
  "root": "miopen",
  "glob": "*.{cpp,hpp,h,c,cc}",
  "maxResults": 100
}
```

`root` には `repoAliases` のキーを直接指定できる。

### 2. `find_symbols` — クラス・関数の定義候補探索

```json
{
  "symbol": "ConvolutionContext",
  "root": "miopen"
}
```

### 3. `query_ctags` — 定義位置・種類の確認

既存の tags ファイルがあればそれを使う。デフォルトでは自動生成しない。
`autoBuild: true` が指定されたときのみ `build_ctags` を内部で呼んでよい。

```json
{
  "symbol": "Invoker",
  "root": "miopen",
  "autoBuild": false
}
```

### 4. `build_ctags` — タグファイル生成

生成物は `<MCP project>/<cacheDir>/<repoAlias>/tags` に書き込む。ソースツリーは変更しない。

```json
{
  "root": "miopen"
}
```

### 5. `query_cscope` — 呼び出し元/先検索

既存の cscope DB があればそれを使う。デフォルトでは自動生成しない。
`autoBuild: true` が指定されたときのみ `build_cscope` を内部で呼んでよい。

```json
{
  "mode": "callers",
  "symbol": "MiirIsConfigApplicable",
  "root": "miopen",
  "autoBuild": false
}
```

`mode` の選択肢: `definition` / `callers` / `callees` / `text`

### 6. `build_cscope` — 呼び出し関係 DB 生成

生成物は `<MCP project>/<cacheDir>/<repoAlias>/cscope.out` に書き込む。ソースツリーは変更しない。

```json
{
  "root": "miopen"
}
```

### 7. `find_compile_commands` — `compile_commands.json` の探索

`ast_dump` を使う前に必ず実行して有効な DB の存在を確認する。

```json
{
  "root": "miopen"
}
```

### 8. `ast_dump` — 限定的な AST 抽出（重い。必要時のみ）

> **前提条件**: 対象 root 配下に有効な `compile_commands.json` が存在する場合のみ有効とする。
> 存在しない場合はエラーではなく「未構成」として返す。
>
> C++ の AST は include path / define / compiler flags がないと崩れるため、
> `find_compile_commands` で DB を確認してから実行すること。

```json
{
  "root": "miopen",
  "file": "src/target_properties.cpp",
  "symbol": "TargetProperties"
}
```

### 9. `collect_hub_points` — ハブ関数の出現位置・参照数の収集

**返すのは以下のみ**。解釈・要約は含まない。

- symbol 名
- 定義ファイル・行番号
- 呼び出し元ファイル数
- 呼び出し先ファイル数
- 関連ファイル一覧（抜粋行付き）

```json
{
  "root": "miopen",
  "symbols": [
    "IsApplicable",
    "GetSolution",
    "ConvolutionContext",
    "TargetProperties"
  ]
}
```

---

## 推奨ツールセット（段階別）

最初から全ツールを使う必要はない。既存 tags が存在する repo では `build_*` なしで `query_*` から始めてよい。

**第1段階（最小構成）**

- `grep_code`
- `find_symbols`
- `query_ctags`
- `find_compile_commands`

**第2段階**

- `build_ctags`
- `build_cscope`
- `query_cscope`

**第3段階（必要な場合のみ）**

- `ast_dump`（`compile_commands.json` が存在する場合のみ）

---

## 運用手順

解析の基本フローはこの順で行う。

1. `grep_code` でハブ関数の出現箇所を洗い出す
2. `find_symbols` / `query_ctags` で定義位置を確認する
3. `query_cscope` で呼び出し元・呼び出し先を追う
4. 必要な場合のみ `ast_dump` で型・構造を確認する（`compile_commands.json` 必須）
5. 人間が Mermaid 図と本文へ落とす

**このサーバーの出力は根拠候補であり、そのまま正本文書に貼り付けない。**

---

## LLVM clone を使う場合の注意

- LLVM/MLIR 基盤の clone は **構文・pass・dialect の理解補助** に使う
- gfx900 の可否判断そのものは MIOpen / rocMLIR 側の公開観測を優先する
- LLVM 側の一般機構だけで ROCm の support policy を断定しない
- 正本は MIOpen / rocMLIR / TheRock / Tensile に置く

全域の call graph 生成は行わない。見る場所は以下に絞る。

```
mlir/
mlir/include/
mlir/lib/
<rocMLIR>/mlir/tools/rocmlir-lib/
<rocMLIR>/mlir/lib/Dialect/Rock/
```

---

## AGENTS.md（このプロジェクトの調査規範）

静的解析フェーズで適用する AGENTS.md をここに定義する。
vega_investigations/ 側の AGENTS.md と内容を共有し、静的解析特有の節を追加している。

```markdown
# AGENTS.md

## 目的

このリポジトリは、ROCm / MIOpen / rocMLIR / Tensile / TheRock などのコードベースに対して、
gfx900 (Vega) の生存経路・設計上の柔軟性・層ごとの後退構造 (Layered Retreat) を
公開一次資料と静的・動的観測から記述するための調査ワークツリーである。

成果物は以下を分離して記録する。

- 何が観測されたか
- どこまで公開一次資料で言えるか
- どこから先が解釈か
- どの層なら外部から修正可能か

---

## 最重要原則

### 1. 意図を断定しない

以下を避けること。

- 社内意思決定の断定
- 非公開 issue の本文内容の推定補完
- contributor の雇用関係・契約関係の断定
- 「AMD が意図的に残した」「コミュニティだけで支えている」のような単線化

許されるのは、公開コード・公開履歴・公開成果物・実機観測から言える範囲のみ。

### 2. 事実と解釈を分ける

文書では以下を明示的に分離する。

| セクション | 内容 |
| --- | --- |
| **Fact** | 公開コード・git 履歴・出荷成果物・実機ログから確認できた事実 |
| **Interpretation** | 観測を踏まえた説明・整理 |
| **Open Question** | 現時点で未確定の点 |
| **Non-claims** | 本文書が主張しないこと |

### 3. 層を混ぜない

以下の層を混同しない。

- Build / Integration
- Runtime / Systems
- Library / Solver Selection
- Compiler / Codegen
- Packaging / Shipped Artifacts

「サポート終了」「動作する」はどの層での話かを明記すること。

### 4. 調査文書と作業計画を分ける

文書の性格を先に固定する。

- **調査記録**: 何が観測されたかを固定する
- **構造説明**: なぜそう見えるかを層構造で説明する
- **作業計画**: どこから触れるか、何を試すかを整理する

同一文書の中で観測記録と作業優先度を混在させない。

---

## 観測ラベル

| ラベル | 意味 |
| --- | --- |
| `code_verified` | 生コードで条件分岐・登録・呼び出しを確認済み |
| `history_verified` | git log / blame / PR / commit で確認済み |
| `runtime_verified` | 実機で動作・失敗モードを確認済み |
| `shipped_artifact_verified` | 出荷パッケージや成果物を確認済み |
| `hint_only` | 周辺資料のみでコード未確認 |
| `hypothesis` | 観測を踏まえた解釈 |
| `unverified` | 未確認 |

---

## 文体ルール

- 強い語気を避ける
- 擬人化や感情的評価は本文に入れない
- 「情けで放置」「温情」等の語は使わない
- 「偶発的残存」「構造上残りうる」「component ごとの後退」などに言い換える
- 境界条件と留保を語り口より優先する

---

## 静的解析の基本方針

### 目的（限定列挙）

1. ハブ関数・責務境界の特定
2. capability 判定と fallback 点の特定
3. component 間接続点の特定
4. 図や構造説明文書の根拠補強

### 避けること

- 巨大 call graph を無目的に生成する
- 自動生成図をそのまま正本に採用する
- 静的解析結果だけで「柔軟性の理由」を断定する

### 推奨ツール

- `rg` / `grep_code`
- `ctags` / `query_ctags`
- `cscope` / `query_cscope`
- `clangd` / `compile_commands.json`
- `clang -Xclang -ast-dump`（`compile_commands.json` 必須・必要時のみ）

### LLVM clone を使う場合

- LLVM/MLIR 基盤は構文・pass・dialect の理解補助に使う
- gfx900 の可否判断は MIOpen / rocMLIR 側の観測を優先する
- LLVM 側の一般機構だけで ROCm の support policy を断定しない

---

## MCP / 自動化エージェントの役割

MCP サーバーは以下に限定する。

- シンボル探索
- 呼び出し関係探索
- compile_commands の発見・検証
- 対象関数・ファイルの一覧化
- 依存関係の粗い地図化

**解釈や結論を自動決定しない。** 出力は人間が確認し、最終文書への反映は手動で行う。

**MCP 出力は「観測補助」であり、単独では `code_verified` を名乗らない。**
`code_verified` は人間が対象コードと位置を確認したあとにのみ付与する。

---

## 成果物の形式

静的解析から生成する成果物は以下のいずれか。

- `*_map.md`
- `*_inventory.md`
- `*_notes.md`
- `*_matrix.md`

各成果物は冒頭に以下を明記すること。

1. この文書の役割
2. 対象範囲
3. 言えること / 言えないこと
4. 参照元

---

## 非推奨

- issue の意図を推定で補完すること
- contributor の所属をメールドメインだけで断定すること
- build target の存在だけで実用サポートを断定すること
- shipped artifact の存在だけで support policy を断定すること
- ベンチマーク不足の状態で性能結論を書くこと

---

## 正本・根拠文書の参照先

| 種別 | 文書 |
| --- | --- |
| 正本 | `final_hypothesis.md`、`support_meaning_conclusion.md` |
| 根拠 | `facts.md`、`support_boundary.md`、`provenance_map.md` |
| 構造説明 | `class_map.md`、`why_rocm_is_flexible.md`、`fallback_chain_map.md` |
| 含意整理 | `future_support_paths.md`、`natural_maintenance_scenarios.md`、`what_can_be_extended.md`、`what_cannot_be_extended.md` |
| 作業補助 | `TODO.md`、`*_inventory.md`、`*_workplan.md` |
```
