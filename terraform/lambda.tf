# Lambda 関数 - 認証系
resource "aws_lambda_function" "auth_register" {
  function_name = "${var.project_name}-auth-register-${var.environment}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "auth/register.handler"
  runtime       = var.lambda_runtime
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory_size

  filename         = "${path.module}/lambda_functions.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda_functions.zip")

  environment {
    variables = {
      USERS_TABLE             = aws_dynamodb_table.users_table.name
      COGNITO_USER_POOL_ID    = aws_cognito_user_pool.main.id
      COGNITO_APP_CLIENT_ID   = aws_cognito_user_pool_client.client.id
      ENVIRONMENT             = var.environment
      EMAIL_SENDER            = var.email_sender
    }
  }
}

resource "aws_lambda_function" "auth_login" {
  function_name = "${var.project_name}-auth-login-${var.environment}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "auth/login.handler"
  runtime       = var.lambda_runtime
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory_size

  filename         = "${path.module}/lambda_functions.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda_functions.zip")

  environment {
    variables = {
      USERS_TABLE             = aws_dynamodb_table.users_table.name
      COGNITO_USER_POOL_ID    = aws_cognito_user_pool.main.id
      COGNITO_APP_CLIENT_ID   = aws_cognito_user_pool_client.client.id
      ENVIRONMENT             = var.environment
    }
  }
}

resource "aws_lambda_function" "auth_logout" {
  function_name = "${var.project_name}-auth-logout-${var.environment}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "auth/logout.handler"
  runtime       = var.lambda_runtime
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory_size

  filename         = "${path.module}/lambda_functions.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda_functions.zip")

  environment {
    variables = {
      USERS_TABLE             = aws_dynamodb_table.users_table.name
      COGNITO_USER_POOL_ID    = aws_cognito_user_pool.main.id
      ENVIRONMENT             = var.environment
    }
  }
}

# Lambda 関数 - リクエスト系
resource "aws_lambda_function" "request_list" {
  function_name = "${var.project_name}-request-list-${var.environment}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "requests/list.handler"
  runtime       = var.lambda_runtime
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory_size

  filename         = "${path.module}/lambda_functions.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda_functions.zip")

  environment {
    variables = {
      REQUESTS_TABLE = aws_dynamodb_table.requests_table.name
      ENVIRONMENT    = var.environment
    }
  }
}

resource "aws_lambda_function" "request_get" {
  function_name = "${var.project_name}-request-get-${var.environment}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "requests/get.handler"
  runtime       = var.lambda_runtime
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory_size

  filename         = "${path.module}/lambda_functions.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda_functions.zip")

  environment {
    variables = {
      REQUESTS_TABLE = aws_dynamodb_table.requests_table.name
      ENVIRONMENT    = var.environment
    }
  }
}

resource "aws_lambda_function" "request_create" {
  function_name = "${var.project_name}-request-create-${var.environment}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "requests/create.handler"
  runtime       = var.lambda_runtime
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory_size

  filename         = "${path.module}/lambda_functions.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda_functions.zip")

  environment {
    variables = {
      REQUESTS_TABLE = aws_dynamodb_table.requests_table.name
      USERS_TABLE    = aws_dynamodb_table.users_table.name
      ENVIRONMENT    = var.environment
    }
  }
}

resource "aws_lambda_function" "request_update" {
  function_name = "${var.project_name}-request-update-${var.environment}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "requests/update.handler"
  runtime       = var.lambda_runtime
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory_size

  filename         = "${path.module}/lambda_functions.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda_functions.zip")

  environment {
    variables = {
      REQUESTS_TABLE = aws_dynamodb_table.requests_table.name
      ENVIRONMENT    = var.environment
    }
  }
}

resource "aws_lambda_function" "request_delete" {
  function_name = "${var.project_name}-request-delete-${var.environment}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "requests/delete.handler"
  runtime       = var.lambda_runtime
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory_size

  filename         = "${path.module}/lambda_functions.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda_functions.zip")

  environment {
    variables = {
      REQUESTS_TABLE = aws_dynamodb_table.requests_table.name
      ENTRIES_TABLE  = aws_dynamodb_table.entries_table.name
      S3_BUCKET      = aws_s3_bucket.image_bucket.bucket
      ENVIRONMENT    = var.environment
    }
  }
}

# Lambda 関数 - 応募系
resource "aws_lambda_function" "entry_list" {
  function_name = "${var.project_name}-entry-list-${var.environment}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "entries/list.handler"
  runtime       = var.lambda_runtime
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory_size

  filename         = "${path.module}/lambda_functions.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda_functions.zip")

  environment {
    variables = {
      ENTRIES_TABLE  = aws_dynamodb_table.entries_table.name
      REQUESTS_TABLE = aws_dynamodb_table.requests_table.name
      ENVIRONMENT    = var.environment
    }
  }
}

resource "aws_lambda_function" "entry_create" {
  function_name = "${var.project_name}-entry-create-${var.environment}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "entries/create.handler"
  runtime       = var.lambda_runtime
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory_size

  filename         = "${path.module}/lambda_functions.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda_functions.zip")

  environment {
    variables = {
      ENTRIES_TABLE  = aws_dynamodb_table.entries_table.name
      REQUESTS_TABLE = aws_dynamodb_table.requests_table.name
      USERS_TABLE    = aws_dynamodb_table.users_table.name
      ENVIRONMENT    = var.environment
    }
  }
}

resource "aws_lambda_function" "entry_presigned" {
  function_name = "${var.project_name}-entry-presigned-${var.environment}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "entries/presigned.handler"
  runtime       = var.lambda_runtime
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory_size

  filename         = "${path.module}/lambda_functions.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda_functions.zip")

  environment {
    variables = {
      S3_BUCKET      = aws_s3_bucket.image_bucket.bucket
      ENVIRONMENT    = var.environment
    }
  }
}

resource "aws_lambda_function" "entry_delete" {
  function_name = "${var.project_name}-entry-delete-${var.environment}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "entries/delete.handler"
  runtime       = var.lambda_runtime
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory_size

  filename         = "${path.module}/lambda_functions.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda_functions.zip")

  environment {
    variables = {
      ENTRIES_TABLE  = aws_dynamodb_table.entries_table.name
      S3_BUCKET      = aws_s3_bucket.image_bucket.bucket
      ENVIRONMENT    = var.environment
    }
  }
}

resource "aws_lambda_function" "entry_purchase" {
  function_name = "${var.project_name}-entry-purchase-${var.environment}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "entries/purchase.handler"
  runtime       = var.lambda_runtime
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory_size

  filename         = "${path.module}/lambda_functions.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda_functions.zip")

  environment {
    variables = {
      ENTRIES_TABLE  = aws_dynamodb_table.entries_table.name
      PAYMENTS_TABLE = aws_dynamodb_table.payments_table.name
      REQUESTS_TABLE = aws_dynamodb_table.requests_table.name
      USERS_TABLE    = aws_dynamodb_table.users_table.name
      S3_BUCKET      = aws_s3_bucket.image_bucket.bucket
      ENVIRONMENT    = var.environment
      # 決済プロバイダのシークレットは Parameter Store 経由など別途管理
    }
  }
}

resource "aws_lambda_function" "entry_download" {
  function_name = "${var.project_name}-entry-download-${var.environment}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "entries/download.handler"
  runtime       = var.lambda_runtime
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory_size

  filename         = "${path.module}/lambda_functions.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda_functions.zip")

  environment {
    variables = {
      ENTRIES_TABLE  = aws_dynamodb_table.entries_table.name
      PAYMENTS_TABLE = aws_dynamodb_table.payments_table.name
      S3_BUCKET      = aws_s3_bucket.image_bucket.bucket
      ENVIRONMENT    = var.environment
    }
  }
}

# Lambda 関数 - 決済系
resource "aws_lambda_function" "payment_callback" {
  function_name = "${var.project_name}-payment-callback-${var.environment}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "payments/callback.handler"
  runtime       = var.lambda_runtime
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory_size

  filename         = "${path.module}/lambda_functions.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda_functions.zip")

  environment {
    variables = {
      PAYMENTS_TABLE = aws_dynamodb_table.payments_table.name
      ENTRIES_TABLE  = aws_dynamodb_table.entries_table.name
      S3_BUCKET      = aws_s3_bucket.image_bucket.bucket
      ENVIRONMENT    = var.environment
      # 決済プロバイダのシークレットは Parameter Store 経由など別途管理
    }
  }
}

# Lambda 関数 - クリーンアップバッチ
resource "aws_lambda_function" "cleanup_lambda" {
  function_name = "${var.project_name}-cleanup-${var.environment}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "cleanup/index.handler"
  runtime       = var.lambda_runtime
  timeout       = "300"  # バッチ処理なので長めに設定
  memory_size   = var.lambda_memory_size

  filename         = "${path.module}/lambda_functions.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda_functions.zip")

  environment {
    variables = {
      REQUESTS_TABLE = aws_dynamodb_table.requests_table.name
      ENTRIES_TABLE  = aws_dynamodb_table.entries_table.name
      S3_BUCKET      = aws_s3_bucket.image_bucket.bucket
      ENVIRONMENT    = var.environment
    }
  }
}