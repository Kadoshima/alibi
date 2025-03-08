provider "aws" {
  region = var.aws_region
}

# S3 バケット設定 - 画像ストレージ用
resource "aws_s3_bucket" "image_bucket" {
  bucket = "${var.project_name}-images-${var.environment}"

  tags = {
    Name        = "${var.project_name}-images"
    Environment = var.environment
  }
}

# S3 バケットのライフサイクルルール設定
resource "aws_s3_bucket_lifecycle_configuration" "image_bucket_lifecycle" {
  bucket = aws_s3_bucket.image_bucket.id

  rule {
    id     = "expire-unselected-images"
    status = "Enabled"

    # 30日後に未選択画像を削除
    expiration {
      days = 30
    }

    # タグベースのフィルター設定（選択済み画像は除外）
    filter {
      tag {
        key   = "Status"
        value = "unselected"
      }
    }
  }

  rule {
    id     = "expire-selected-images"
    status = "Enabled"

    # 7日後に選択済み画像を削除（ダウンロード後）
    expiration {
      days = 7
    }

    filter {
      tag {
        key   = "Status"
        value = "selected"
      }
    }
  }
}

# バケットポリシー - CORS設定など
resource "aws_s3_bucket_cors_configuration" "image_bucket_cors" {
  bucket = aws_s3_bucket.image_bucket.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = ["*"] # 本番環境では特定のドメインに制限すべき
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# DynamoDB テーブル設定 - ユーザー
resource "aws_dynamodb_table" "users_table" {
  name         = "${var.project_name}-users-${var.environment}"
  billing_mode = "PAY_PER_REQUEST" # オンデマンドキャパシティで低コスト化
  hash_key     = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  global_secondary_index {
    name            = "EmailIndex"
    hash_key        = "email"
    projection_type = "ALL"
  }

  tags = {
    Name        = "${var.project_name}-users"
    Environment = var.environment
  }
}

# DynamoDB テーブル - リクエスト（買い手の募集）
resource "aws_dynamodb_table" "requests_table" {
  name         = "${var.project_name}-requests-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "requestId"

  attribute {
    name = "requestId"
    type = "S"
  }

  attribute {
    name = "buyerId"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  global_secondary_index {
    name            = "BuyerIndex"
    hash_key        = "buyerId"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "StatusIndex"
    hash_key        = "status"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  tags = {
    Name        = "${var.project_name}-requests"
    Environment = var.environment
  }
}

# DynamoDB テーブル - 応募（売り手の写真投稿）
resource "aws_dynamodb_table" "entries_table" {
  name         = "${var.project_name}-entries-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "entryId"

  attribute {
    name = "entryId"
    type = "S"
  }

  attribute {
    name = "requestId"
    type = "S"
  }

  attribute {
    name = "sellerId"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  global_secondary_index {
    name            = "RequestIndex"
    hash_key        = "requestId"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "SellerIndex"
    hash_key        = "sellerId"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  tags = {
    Name        = "${var.project_name}-entries"
    Environment = var.environment
  }
}

# DynamoDB テーブル - 支払い
resource "aws_dynamodb_table" "payments_table" {
  name         = "${var.project_name}-payments-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "paymentId"

  attribute {
    name = "paymentId"
    type = "S"
  }

  attribute {
    name = "requestId"
    type = "S"
  }

  attribute {
    name = "entryId"
    type = "S"
  }

  attribute {
    name = "buyerId"
    type = "S"
  }

  global_secondary_index {
    name            = "RequestEntryIndex"
    hash_key        = "requestId"
    range_key       = "entryId"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "BuyerPaymentIndex"
    hash_key        = "buyerId"
    projection_type = "ALL"
  }

  tags = {
    Name        = "${var.project_name}-payments"
    Environment = var.environment
  }
}

# Cognito ユーザープール - 認証
resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-users-${var.environment}"

  auto_verified_attributes = ["email"]
  
  # パスワードポリシー
  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }

  # 確認メッセージのカスタマイズ
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "あなたの確認コード"
    email_message        = "確認コード: {####}"
  }

  schema {
    name                     = "email"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = true
    string_attribute_constraints {
      min_length = 0
      max_length = 2048
    }
  }

  schema {
    name                     = "name"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = true
    string_attribute_constraints {
      min_length = 0
      max_length = 2048
    }
  }

  # ユーザーの自己登録を許可
  admin_create_user_config {
    allow_admin_create_user_only = false
  }
}

# Cognito App Client
resource "aws_cognito_user_pool_client" "client" {
  name         = "${var.project_name}-client-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret                      = false
  refresh_token_validity               = 30
  prevent_user_existence_errors        = "ENABLED"
  explicit_auth_flows                  = ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_USER_PASSWORD_AUTH"]
  allowed_oauth_flows_user_pool_client = false
}

# Lambda IAM ロール
resource "aws_iam_role" "lambda_role" {
  name = "${var.project_name}-lambda-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Lambda 基本権限ポリシー
resource "aws_iam_role_policy" "lambda_policy" {
  name = "${var.project_name}-lambda-policy-${var.environment}"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.users_table.arn,
          aws_dynamodb_table.requests_table.arn,
          aws_dynamodb_table.entries_table.arn,
          aws_dynamodb_table.payments_table.arn,
          "${aws_dynamodb_table.users_table.arn}/index/*",
          "${aws_dynamodb_table.requests_table.arn}/index/*",
          "${aws_dynamodb_table.entries_table.arn}/index/*",
          "${aws_dynamodb_table.payments_table.arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:PutObjectTagging"
        ]
        Resource = "${aws_s3_bucket.image_bucket.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminInitiateAuth",
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminSetUserPassword"
        ]
        Resource = aws_cognito_user_pool.main.arn
      },
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "*"
      }
    ]
  })
}

# REST API Gateway
resource "aws_api_gateway_rest_api" "api" {
  name        = "${var.project_name}-api-${var.environment}"
  description = "REST API for ${var.project_name}"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# API Gateway 認証用オーソライザー
resource "aws_api_gateway_authorizer" "cognito" {
  name            = "cognito-authorizer"
  rest_api_id     = aws_api_gateway_rest_api.api.id
  type            = "COGNITO_USER_POOLS"
  provider_arns   = [aws_cognito_user_pool.main.arn]
  identity_source = "method.request.header.Authorization"
}

# CloudWatch Event Rule（定期バッチ処理用）
resource "aws_cloudwatch_event_rule" "cleanup_rule" {
  name                = "${var.project_name}-cleanup-${var.environment}"
  description         = "Trigger cleanup lambda function daily"
  schedule_expression = "cron(0 0 * * ? *)" # 毎日0時に実行
}

# EventBridge Target
resource "aws_cloudwatch_event_target" "cleanup_target" {
  rule      = aws_cloudwatch_event_rule.cleanup_rule.name
  target_id = "CleanupLambda"
  arn       = aws_lambda_function.cleanup_lambda.arn
}

# Lambda 関数権限（EventBridge からの呼び出し許可）
resource "aws_lambda_permission" "allow_cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cleanup_lambda.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.cleanup_rule.arn
}

# バックエンドリソースのOutputs
output "api_gateway_url" {
  value = "${aws_api_gateway_rest_api.api.execution_arn}/*/api/*"
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "cognito_app_client_id" {
  value = aws_cognito_user_pool_client.client.id
}

output "s3_bucket_name" {
  value = aws_s3_bucket.image_bucket.bucket
}