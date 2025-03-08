# /auth リソース
resource "aws_api_gateway_resource" "auth" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "auth"
}

# /auth/register リソース
resource "aws_api_gateway_resource" "register" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.auth.id
  path_part   = "register"
}

# /auth/login リソース
resource "aws_api_gateway_resource" "login" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.auth.id
  path_part   = "login"
}

# /auth/logout リソース
resource "aws_api_gateway_resource" "logout" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.auth.id
  path_part   = "logout"
}

# /requests リソース
resource "aws_api_gateway_resource" "requests" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "requests"
}

# /requests/{requestId} リソース
resource "aws_api_gateway_resource" "request_id" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.requests.id
  path_part   = "{requestId}"
}

# /requests/{requestId}/entries リソース
resource "aws_api_gateway_resource" "entries" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.request_id.id
  path_part   = "entries"
}

# /requests/{requestId}/entries/{entryId} リソース
resource "aws_api_gateway_resource" "entry_id" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.entries.id
  path_part   = "{entryId}"
}

# /requests/{requestId}/entries/presigned リソース
resource "aws_api_gateway_resource" "presigned" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.entries.id
  path_part   = "presigned"
}

# /requests/{requestId}/entries/purchase リソース
resource "aws_api_gateway_resource" "purchase" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.entries.id
  path_part   = "purchase"
}

# /requests/{requestId}/entries/{entryId}/download リソース
resource "aws_api_gateway_resource" "download" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.entry_id.id
  path_part   = "download"
}

# /payments リソース
resource "aws_api_gateway_resource" "payments" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "payments"
}

# /payments/callback リソース
resource "aws_api_gateway_resource" "callback" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.payments.id
  path_part   = "callback"
}

# 以下、各エンドポイントのメソッド定義

# POST /auth/register
resource "aws_api_gateway_method" "register_post" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.register.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "register_post" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.register.id
  http_method             = aws_api_gateway_method.register_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.auth_register.invoke_arn
}

# POST /auth/login
resource "aws_api_gateway_method" "login_post" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.login.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "login_post" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.login.id
  http_method             = aws_api_gateway_method.login_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.auth_login.invoke_arn
}

# POST /auth/logout
resource "aws_api_gateway_method" "logout_post" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.logout.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "logout_post" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.logout.id
  http_method             = aws_api_gateway_method.logout_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.auth_logout.invoke_arn
}

# GET /requests
resource "aws_api_gateway_method" "requests_get" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.requests.id
  http_method   = "GET"
  authorization = "NONE" # 一覧表示は認証不要
}

resource "aws_api_gateway_integration" "requests_get" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.requests.id
  http_method             = aws_api_gateway_method.requests_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.request_list.invoke_arn
}

# POST /requests
resource "aws_api_gateway_method" "requests_post" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.requests.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "requests_post" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.requests.id
  http_method             = aws_api_gateway_method.requests_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.request_create.invoke_arn
}

# GET /requests/{requestId}
resource "aws_api_gateway_method" "request_id_get" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.request_id.id
  http_method   = "GET"
  authorization = "NONE" # 詳細表示も認証不要
  request_parameters = {
    "method.request.path.requestId" = true
  }
}

resource "aws_api_gateway_integration" "request_id_get" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.request_id.id
  http_method             = aws_api_gateway_method.request_id_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.request_get.invoke_arn
}

# PUT /requests/{requestId}
resource "aws_api_gateway_method" "request_id_put" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.request_id.id
  http_method   = "PUT"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
  request_parameters = {
    "method.request.path.requestId" = true
  }
}

resource "aws_api_gateway_integration" "request_id_put" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.request_id.id
  http_method             = aws_api_gateway_method.request_id_put.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.request_update.invoke_arn
}

# DELETE /requests/{requestId}
resource "aws_api_gateway_method" "request_id_delete" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.request_id.id
  http_method   = "DELETE"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
  request_parameters = {
    "method.request.path.requestId" = true
  }
}

resource "aws_api_gateway_integration" "request_id_delete" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.request_id.id
  http_method             = aws_api_gateway_method.request_id_delete.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.request_delete.invoke_arn
}

# GET /requests/{requestId}/entries
resource "aws_api_gateway_method" "entries_get" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.entries.id
  http_method   = "GET"
  authorization = "NONE" # 応募一覧も認証不要
  request_parameters = {
    "method.request.path.requestId" = true
  }
}

resource "aws_api_gateway_integration" "entries_get" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.entries.id
  http_method             = aws_api_gateway_method.entries_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.entry_list.invoke_arn
}

# POST /requests/{requestId}/entries
resource "aws_api_gateway_method" "entries_post" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.entries.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
  request_parameters = {
    "method.request.path.requestId" = true
  }
}

resource "aws_api_gateway_integration" "entries_post" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.entries.id
  http_method             = aws_api_gateway_method.entries_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.entry_create.invoke_arn
}

# 残りのエンドポイントも同様に定義...

# API Gateway デプロイメント
resource "aws_api_gateway_deployment" "api" {
  depends_on = [
    aws_api_gateway_integration.register_post,
    aws_api_gateway_integration.login_post,
    aws_api_gateway_integration.logout_post,
    aws_api_gateway_integration.requests_get,
    aws_api_gateway_integration.requests_post,
    aws_api_gateway_integration.request_id_get,
    aws_api_gateway_integration.request_id_put,
    aws_api_gateway_integration.request_id_delete,
    aws_api_gateway_integration.entries_get,
    aws_api_gateway_integration.entries_post,
    # その他のインテグレーション
  ]

  rest_api_id = aws_api_gateway_rest_api.api.id
  stage_name  = var.environment
}

# Lambda 関数への実行権限付与
resource "aws_lambda_permission" "api_gateway_auth_register" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth_register.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.api.execution_arn}/*/*/auth/register"
}

resource "aws_lambda_permission" "api_gateway_auth_login" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth_login.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.api.execution_arn}/*/*/auth/login"
}

# 他の Lambda 関数に対しても同様の権限設定