つくれるにゃん。
しかも今回の用途なら、**「ROCm / MIOpen の静的解析専用」** にかなり寄せたやつを最初から作ったほうがいいにゃ。

方針としてはこうだにゃん。

* **AGENTS.md** は「このプロジェクトで何を正本とし、何を断定してはいけないか」を固定
* **MCPサーバー構成** は「rg / ctags / cscope / compile_commands / clang AST を安全に叩く」ための道具箱化

まずはそのまま置けるたたき台を出すにゃ。

---

## `AGENTS.md` たたき台

```md
# AGENTS.md

## 目的

このリポジトリは、ROCm / MIOpen / rocMLIR / Tensile / TheRock などのコードベースに対して、
**gfx900 (Vega) の生存経路、設計上の柔軟性、層ごとの後退構造 (Layered Retreat) を公開一次資料と静的・動的観測から記述する**
ための調査ワークツリーである。

本リポジトリの成果物は、単なる要約ではなく、以下を分離して記録することを目的とする。

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

許されるのは、公開コード・公開履歴・公開成果物・実機観測から言える範囲だけである。

---

### 2. 事実と解釈を分ける

文書では以下を明示的に分離する。

- **Fact**: 公開コード、git 履歴、出荷成果物、実機ログから確認できた事実
- **Interpretation**: 観測を踏まえた説明・整理
- **Open Question**: 現時点で未確定の点
- **Non-claims**: 本文書が主張しないこと

---

### 3. 層を混ぜない

ROCm の議論では、以下の層を混同しない。

- Build / Integration
- Runtime / Systems
- Library / Solver Selection
- Compiler / Codegen
- Packaging / Shipped Artifacts

「サポート終了」や「動作する」は、どの層での話かを明記すること。

---

### 4. 調査文書と作業計画を分ける

文書は性格を先に固定する。

- **調査記録**: 何が観測されたかを固定する
- **構造説明**: なぜそう見えるかを層構造で説明する
- **作業計画**: どこから触れるか、何を試すかを整理する

同一文書の中で、観測記録と作業優先度を混在させない。

---

## 推奨ラベル

必要に応じて以下を使う。

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

- 強い語気は避ける
- 擬人化や感情的評価は本文に入れない
- 「情けで放置」「温情」などの語は使わない
- 必要なら「偶発的残存」「構造上残りうる」「component ごとの後退」などに言い換える
- 語り口よりも、境界条件と留保を優先する

---

## 正本と補助文書

### 正本
- `final_hypothesis.md`

### 根拠文書
- `facts.md`
- `support_boundary.md`
- `provenance_map.md`
- `vega-rocm.md`
- `reveal_hypothesis.md`

### 構造説明文書
- `class_map.md`
- `device_capability_flow.md`
- `fallback_chain_map.md`
- `abstraction_layers.md`
- `design_philosophy.md`

### 作業補助
- `TODO.md`
- `work_logs.md`
- `*_audit.md`
- `*_inventory.md`
- `*_workplan.md`

---

## 静的解析の基本方針

### 目的
静的解析の目的は、以下のどれかに限定する。

1. ハブ関数・責務境界の特定
2. capability 判定と fallback 点の特定
3. component 間接続点の特定
4. 図や構造説明文書の根拠補強

### 避けること
- 巨大 call graph を無目的に生成する
- 自動生成図をそのまま正本に採用する
- 静的解析結果だけで「柔軟性の理由」を断定する

### 推奨ツール
- `rg`
- `ctags`
- `cscope`
- `clangd`
- `compile_commands.json`
- 必要時のみ `clang -Xclang -ast-dump`

---

## MCP / 自動化エージェントの利用方針

MCP サーバーやエージェントは以下の役割に限定する。

- シンボル探索
- 呼び出し関係探索
- compile_commands の発見・検証
- 対象関数・ファイルの一覧化
- 依存関係の粗い地図化

MCP サーバーは、**解釈や結論を自動決定しない**。
出力は常に人間が確認し、最終文書への反映は手動で行う。

---

## 非推奨

- 「この issue はきっとこういう意味だ」と埋めること
- contributor の所属をメールだけで断定すること
- build target の存在だけで実用サポートを断定すること
- shipped artifact の存在だけで support policy を断定すること
- ベンチマーク不足の状態で性能結論を書くこと

---

## 期待する成果物

静的解析から得たい成果物は次のいずれかである。

- `*_map.md`
- `*_inventory.md`
- `*_notes.md`
- `*_matrix.md`

各成果物は、冒頭に以下を明記すること。

1. この文書の役割
2. 対象範囲
3. 言えること / 言えないこと
4. 参照元
```

---

## MCPサーバー構成案

今回は「まず動くこと」を優先して、**stdio 型の軽量MCP** を想定するにゃん。
役割はこうだにゃ。

* repo ルートの探索
* `rg` 検索
* `ctags` 生成と参照
* `cscope` DB 生成と検索
* `compile_commands.json` の発見
* 必要な時だけ `clang AST` 呼び出し

### ディレクトリ案

```text
mcp-rocm-static/
├── README.md
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── tools/
│   │   ├── find_symbols.ts
│   │   ├── grep_code.ts
│   │   ├── build_ctags.ts
│   │   ├── query_ctags.ts
│   │   ├── build_cscope.ts
│   │   ├── query_cscope.ts
│   │   ├── find_compile_commands.ts
│   │   ├── ast_dump.ts
│   │   └── summarize_hub_points.ts
│   └── util/
│       ├── exec.ts
│       ├── fs.ts
│       └── repo.ts
└── config/
    └── rocm-static.json
```

---

## `config/rocm-static.json` 例

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
  "tools": {
    "grep_code": {
      "enabled": true,
      "maxResults": 200
    },
    "find_symbols": {
      "enabled": true
    },
    "build_ctags": {
      "enabled": true,
      "output": ".cache/tags"
    },
    "query_ctags": {
      "enabled": true
    },
    "build_cscope": {
      "enabled": true,
      "output": ".cache/cscope.out"
    },
    "query_cscope": {
      "enabled": true
    },
    "find_compile_commands": {
      "enabled": true
    },
    "ast_dump": {
      "enabled": true,
      "maxFiles": 3
    },
    "summarize_hub_points": {
      "enabled": true
    }
  },
  "policies": {
    "allowWrite": false,
    "allowDelete": false,
    "allowOutsideRoots": false,
    "maxFileReadBytes": 262144
  },
  "defaults": {
    "preferredLanguages": ["cpp", "c", "cmake", "python", "rst", "yaml"],
    "hubFunctions": [
      "IsApplicable",
      "GetSolution",
      "FindCore",
      "SolverContainer",
      "miirCreateHandle",
      "MiirIsConfigApplicable",
      "RockEnabled",
      "CallHipBlas",
      "BuildCodeObjectInMemory"
    ]
  }
}
```

---

## Claude Desktop / 汎用MCPクライアント向け設定例

Node/TypeScript 製を想定した例だにゃ。

```json
{
  "mcpServers": {
    "rocm-static-analysis": {
      "command": "node",
      "args": [
        "/home/limonene/Projects/mcp-rocm-static/dist/index.js",
        "--config",
        "/home/limonene/Projects/mcp-rocm-static/config/rocm-static.json"
      ]
    }
  }
}
```

---

## サーバーが提供するツール案

### 1. `grep_code`

コード全域を軽く掘る用。

**入力例**

```json
{
  "pattern": "IsApplicable|GetSolution|miirCreateHandle",
  "root": "/home/limonene/ROCm-project/WD-Black/ROCm-repos/MIOpen",
  "glob": "*.{cpp,hpp,h,c,cc}",
  "maxResults": 100
}
```

### 2. `find_symbols`

クラスや関数の定義候補を探す。

**入力例**

```json
{
  "symbol": "ConvolutionContext",
  "root": "/home/limonene/ROCm-project/WD-Black/ROCm-repos/MIOpen"
}
```

### 3. `build_ctags`

tags 生成。

**入力例**

```json
{
  "root": "/home/limonene/ROCm-project/WD-Black/ROCm-repos/MIOpen"
}
```

### 4. `query_ctags`

定義位置・種類確認。

**入力例**

```json
{
  "symbol": "Invoker",
  "root": "/home/limonene/ROCm-project/WD-Black/ROCm-repos/MIOpen"
}
```

### 5. `build_cscope`

呼び出し関係 DB 作成。

**入力例**

```json
{
  "root": "/home/limonene/ROCm-project/WD-Black/ROCm-repos/MIOpen"
}
```

### 6. `query_cscope`

呼び出し元/先検索。

**入力例**

```json
{
  "mode": "callers",
  "symbol": "MiirIsConfigApplicable",
  "root": "/home/limonene/ROCm-project/WD-Black/ROCm-repos/MIOpen"
}
```

`mode` は例えばこんな感じにゃ。

* `definition`
* `callees`
* `callers`
* `text`

### 7. `find_compile_commands`

`compile_commands.json` を探す。

**入力例**

```json
{
  "root": "/home/limonene/ROCm-project/WD-Black/ROCm-repos/MIOpen"
}
```

### 8. `ast_dump`

限定的な AST 抽出。

**入力例**

```json
{
  "file": "/home/limonene/ROCm-project/WD-Black/ROCm-repos/MIOpen/src/target_properties.cpp",
  "symbol": "TargetProperties"
}
```

### 9. `summarize_hub_points`

ハブ関数と責務境界の粗いサマリを返す。

**入力例**

```json
{
  "root": "/home/limonene/ROCm-project/WD-Black/ROCm-repos/MIOpen",
  "symbols": [
    "IsApplicable",
    "GetSolution",
    "ConvolutionContext",
    "TargetProperties"
  ]
}
```

---

## 使い方の基本ルール

このMCPは、**解析結果をそのまま正本に貼るためのものではなく、根拠候補を拾うためのもの** にするのがいいにゃん。

おすすめの運用順はこうだにゃ。

1. `grep_code` でハブ関数を洗う
2. `find_symbols` / `query_ctags` で定義を拾う
3. `query_cscope` で呼び出し元/先を見る
4. 必要な時だけ `ast_dump`
5. 最後に人間が Mermaid と本文に落とす

---

## いまの目的に合わせた最小ツールセット

最初から全部作らなくてもいいにゃ。
まずはこの5個でかなり戦えるにゃん。

* `grep_code`
* `find_symbols`
* `build_ctags`
* `query_ctags`
* `find_compile_commands`

その次に

* `build_cscope`
* `query_cscope`

最後に必要なら

* `ast_dump`

これがいちばん疲れないにゃ。


## AGENTS.md / MCP 側で追加したいこと

### AGENTS.md に1段足す

静的解析の章に、こんな趣旨を入れるとよいにゃ。

* LLVM/MLIR 基盤 clone は **構文・pass・dialect の理解補助** に使う
* ただし、**gfx900 の可否判断そのものは MIOpen/rocMLIR 側の公開観測を優先**
* LLVM 側の一般機構だけで ROCm の support policy を断定しない

これで、下の基盤を見てるうちに話が大きくなりすぎる事故を防げるにゃ。

### MCP config に roots を増やす

いまの `rocm-static.json` に、LLVM 系 clone を追加する感じだにゃ。

たとえば：

```json
{
  "roots": [
    "/home/limonene/ROCm-project/WD-Black/ROCm-repos/MIOpen",
    "/home/limonene/ROCm-project/WD-Black/ROCm-repos/rocMLIR",
    "/home/limonene/ROCm-project/WD-Black/ROCm-repos/llvm-project",
    "/home/limonene/ROCm-project/WD-Black/ROCm-repos/TheRock",
    "/home/limonene/ROCm-project/WD-Black/ROCm-repos/rocm-systems"
  ]
}
```

みたいな感じだにゃん。

---

## ただし注意点

### LLVM 側は広すぎる

ここはほんとにそうだにゃ。
だから最初から全域解析しないで、**見る場所を絞る** のが大事だにゃん。

最初に見る候補はこのへんで十分だと思うにゃ：

* `mlir/`
* `mlir/include/`
* `mlir/lib/`
* rocMLIR の Rock dialect 周辺
* rocMLIR の `Generator/`
* rocMLIR の `rocmlir-lib.cpp`

### 正本はあくまで ROCm 側

LLVM clone は便利だけど、今回の問いは
**gfx900 が ROCm でどう扱われているか**
だから、正本はやっぱり

* `MIOpen`
* `rocMLIR`
* `TheRock`
* `Tensile`
  あたりに置いた方がいいにゃん。

---

## いまの次の一手

ここまで来たなら、まずはわたしはこれをやるにゃ。

### 1

LLVM 系 clone を含めた **repo 一覧表** を作る
列は

* repo 名
* 役割
* 主に見る理由
* 優先度

### 2

MCP config の `roots` をその一覧に合わせて更新

### 3

hub symbols を少し増やす
今ならこんなのも入れたいにゃ。

* `parseConvConfig`
* `buildKernelPipeline`
* `RockEnabled`
* `isApplicable`
* `MiirIsConfigApplicable`