#!/bin/bash
set -e

# 必要なコマンドの確認
command -v aws >/dev/null 2>&1 || { echo "AWS CLI がインストールされていません。"; exit 1; }
command -v terraform >/dev/null 2>&1 || { echo "Terraform がインストールされていません。"; exit 1; }
command -v zip >/dev/null 2>&1 || { echo "zip コマンドがインストールされていません。"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm がインストールされていません。"; exit 1; }

# デプロイ環境設定
ENV=${1:-dev}
REGION=${2:-ap-northeast-1}
PROJECT_NAME=${3:-photo-marketplace}

echo "デプロイ環境: $ENV"
echo "リージョン: $REGION"
echo "プロジェクト名: $PROJECT_NAME"

# 作業ディレクトリを設定
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# 必要なディレクトリの作成
mkdir -p dist

# Lambda 関数用のパッケージをインストール
echo "Lambda 関数用の依存パッケージをインストールしています..."
cd lambda
npm install --production
cd ..

# Lambda 関数をzip圧縮
echo "Lambda 関数を zip 圧縮しています..."
cd lambda
zip -r ../dist/lambda_functions.zip . -x "node_modules/aws-sdk/*" "*.git*" "*.DS_Store*" "*.vscode*"
cd ..

# Terraform ディレクトリにZIPファイルをコピー
echo "Lambda 関数のZIPファイルをTerraformディレクトリにコピーしています..."
cp dist/lambda_functions.zip terraform/

# Terraform 初期化と適用
echo "Terraform を初期化しています..."
cd terraform
terraform init

echo "Terraform 実行計画を作成しています..."
terraform plan -var="environment=$ENV" -var="aws_region=$REGION" -var="project_name=$PROJECT_NAME" -out=tfplan

echo "Terraform スタックをデプロイしています..."
terraform apply tfplan

# デプロイ結果を表示
echo "デプロイが完了しました！"
echo "API Gateway エンドポイント:"
terraform output api_gateway_url

echo "Cognito ユーザープール ID:"
terraform output cognito_user_pool_id

echo "Cognito アプリクライアント ID:"
terraform output cognito_app_client_id

echo "S3 バケット名:"
terraform output s3_bucket_name

cd ..

echo "デプロイスクリプトが正常に完了しました。"