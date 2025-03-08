# alibi

アリバイ売買アプリです。

# 写真マーケットプレイス バックエンド

写真マーケットプレイスのAWS サーバーレスバックエンドシステム。

## アーキテクチャ

このバックエンドは以下のAWS サービスを使用しています：

- **API Gateway**: REST API エンドポイントの提供
- **Lambda**: サーバーレス関数でビジネスロジックを実装
- **DynamoDB**: NoSQL データベース
- **S3**: 画像ストレージ
- **Cognito**: ユーザー認証と認可
- **EventBridge**: スケジュールされたタスクの実行
- **CloudWatch**: ログ監視

## ディレクトリ構造

```
.
├── lambda/                     # Lambda 関数のソースコード
│   ├── auth/                   # 認証関連
│   │   ├── login.js
│   │   ├── logout.js
│   │   ├── register.js
│   │   └── verify.js
│   ├── requests/               # リクエスト関連
│   │   ├── create.js
│   │   ├── delete.js
│   │   ├── get.js
│   │   ├── list.js
│   │   └── update.js
│   ├── entries/                # 応募関連
│   │   ├── create.js
│   │   ├── delete.js
│   │   ├── download.js
│   │   ├── list.js
│   │   ├── presigned.js
│   │   └── purchase.js
│   ├── payments/               # 決済関連
│   │   └── callback.js
│   ├── cleanup/                # クリーンアップバッチ
│   │   └── index.js
│   └── lib/                    # 共通ユーティリティ
│       ├── auth.js
│       ├── db.js
│       └── s3.js
├── terraform/                  # インフラ構成
│   ├── main.tf
│   ├── variables.tf
│   ├── api-gateway.tf
│   └── lambda.tf
├── dist/                       # ビルド成果物
│   └── lambda_functions.zip
├── deploy.sh                   # デプロイスクリプト
└── README.md
```

## APIエンドポイント

### 認証

| エンドポイント               | HTTP | 説明                           |
|-----------------------------|------|-------------------------------|
| `/auth/register`            | POST | 新規登録                       |
| `/auth/login`               | POST | ログイン                       |
| `/auth/logout`              | POST | ログアウト                     |

### リクエスト管理

| エンドポイント               | HTTP   | 説明                         |
|-----------------------------|--------|------------------------------|
| `/requests`                 | GET    | リクエスト一覧取得           |
| `/requests`                 | POST   | 新規リクエスト作成           |
| `/requests/{requestId}`     | GET    | リクエスト詳細取得           |
| `/requests/{requestId}`     | PUT    | リクエスト編集               |
| `/requests/{requestId}`     | DELETE | リクエスト削除               |

### 応募管理

| エンドポイント                                    | HTTP   | 説明                                 |
|--------------------------------------------------|--------|-------------------------------------|
| `/requests/{requestId}/entries`                 | GET    | リクエストへの応募一覧取得           |
| `/requests/{requestId}/entries`                 | POST   | 応募作成                             |
| `/requests/{requestId}/entries/presigned`       | POST   | 署名付きアップロードURL取得          |
| `/requests/{requestId}/entries/{entryId}`       | DELETE | 応募削除                             |
| `/requests/{requestId}/entries/purchase`        | POST   | 写真購入                             |
| `/requests/{requestId}/entries/{entryId}/download` | GET  | 高解像度ダウンロード用URL取得        |

### 決済

| エンドポイント                                    | HTTP   | 説明                              |
|--------------------------------------------------|--------|----------------------------------|
| `/payments/callback`                             | POST   | 決済コールバック                  |

## セットアップと実行

### 前提条件

- AWS CLI のインストールと設定
- Terraform のインストール
- Node.js と npm のインストール

### デプロイ

1. リポジトリをクローン：
   ```
   git clone <repository-url>
   cd photo-marketplace
   ```

2. デプロイスクリプトを実行：
   ```
   chmod +x deploy.sh
   ./deploy.sh dev ap-northeast-1 photo-marketplace
   ```

   パラメータ:
   - 環境 (dev/staging/prod)
   - AWS リージョン
   - プロジェクト名

### テスト

```
cd lambda
npm test
```

## 環境変数

Terraformが以下の環境変数を Lambda 関数に設定します：

- `USERS_TABLE` - ユーザーテーブル名
- `REQUESTS_TABLE` - リクエストテーブル名
- `ENTRIES_TABLE` - エントリーテーブル名
- `PAYMENTS_TABLE` - 支払いテーブル名
- `S3_BUCKET` - 画像ストレージバケット名
- `COGNITO_USER_POOL_ID` - Cognito ユーザープールID
- `COGNITO_APP_CLIENT_ID` - Cognito アプリクライアントID
- `EMAIL_SENDER` - 通知メール送信元アドレス

## ライセンス

独自ライセンス