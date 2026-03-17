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