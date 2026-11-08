# infra/main.tf - The neon1.tech assistant: one function behind an HTTP API, a counter table
# for spend caps, and the parameters the site's CloudFront distribution reads.
#
# The browser reaches the API through https://neon1.tech/chat/api/*, never directly, so the
# site and 1NEON keep connect-src 'self'. CloudFront proves itself with a secret header.


data "aws_caller_identity" "current" {}
data "aws_region" "current" {}


locals {
  name       = "neon1-chat-prod"
  account    = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.region
  api_domain = replace(aws_apigatewayv2_api.chat.api_endpoint, "https://", "")
}


# --- Secrets: never in the repo, only in state, the function, and SSM ---


# CloudFront sends this header on every request; anything without it is refused
resource "random_password" "origin_secret" {
  length  = 48
  special = false
}

# Salts the visitor hash, so counter keys can't be matched to an address
resource "random_password" "hash_salt" {
  length  = 32
  special = false
}


# --- Counters: per-visitor and daily caps that expire on their own ---


# Only short-lived counters live here, so there is nothing to back up or restore
resource "aws_dynamodb_table" "counters" {
  name         = local.name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"

  attribute {
    name = "pk"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  server_side_encryption {
    enabled = true
  }
}


# --- The function: the app folder as is, since the Lambda runtime ships the AWS SDK ---


# Source and the public corpus; tests stay out of the bundle
data "archive_file" "app" {
  type        = "zip"
  source_dir  = "${path.module}/../app"
  output_path = "${path.module}/.build/app.zip"
  excludes    = ["test"]
}

# Two weeks of logs is enough to debug; message text is never logged
resource "aws_cloudwatch_log_group" "chat" {
  name              = "/aws/lambda/${local.name}"
  retention_in_days = 14
}

resource "aws_iam_role" "chat" {
  name = local.name

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# Write its own logs, call one model, and count in one table
data "aws_iam_policy_document" "chat" {
  statement {
    sid       = "Logs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.chat.arn}:*"]
  }

  # The US inference profile, and the model in each US region it may route to
  statement {
    sid     = "Model"
    actions = ["bedrock:InvokeModel"]
    resources = [
      "arn:aws:bedrock:${local.region}:${local.account}:inference-profile/${var.model_profile}",
      "arn:aws:bedrock:us-east-1::foundation-model/${var.model_id}",
      "arn:aws:bedrock:us-east-2::foundation-model/${var.model_id}",
      "arn:aws:bedrock:us-west-2::foundation-model/${var.model_id}",
    ]
  }

  statement {
    sid       = "Counters"
    actions   = ["dynamodb:UpdateItem"]
    resources = [aws_dynamodb_table.counters.arn]
  }
}

resource "aws_iam_role_policy" "chat" {
  name   = "chat"
  role   = aws_iam_role.chat.id
  policy = data.aws_iam_policy_document.chat.json
}

# Small and arm64: replies take a second or two, and reserved concurrency caps a flood
resource "aws_lambda_function" "chat" {
  function_name                  = local.name
  role                           = aws_iam_role.chat.arn
  runtime                        = "nodejs22.x"
  architectures                  = ["arm64"]
  handler                        = "src/handler.handler"
  memory_size                    = 256
  timeout                        = 20
  reserved_concurrent_executions = var.concurrency
  filename                       = data.archive_file.app.output_path
  source_code_hash               = data.archive_file.app.output_base64sha256

  environment {
    variables = {
      MODEL_ID      = var.model_profile
      MAX_TOKENS    = tostring(var.max_tokens)
      TABLE_NAME    = aws_dynamodb_table.counters.name
      PER_HOUR      = tostring(var.per_hour)
      PER_DAY       = tostring(var.per_day)
      ORIGIN_SECRET = random_password.origin_secret.result
      HASH_SALT     = random_password.hash_salt.result
    }
  }

  depends_on = [aws_cloudwatch_log_group.chat, aws_iam_role_policy.chat]
}


# --- HTTP API: two routes, throttled at the stage ---


resource "aws_apigatewayv2_api" "chat" {
  name          = local.name
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "chat" {
  api_id                 = aws_apigatewayv2_api.chat.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.chat.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 25000
}

# The paths match what CloudFront forwards, so no rewriting is needed at the edge
resource "aws_apigatewayv2_route" "chat" {
  for_each = toset(["GET /chat/api/health", "POST /chat/api/chat"])

  api_id    = aws_apigatewayv2_api.chat.id
  route_key = each.key
  target    = "integrations/${aws_apigatewayv2_integration.chat.id}"
}

# A low ceiling for the whole API; per-visitor caps live in the function
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.chat.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_rate_limit  = 5
    throttling_burst_limit = 10
  }
}

resource "aws_lambda_permission" "api" {
  statement_id  = "AllowHttpApi"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.chat.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.chat.execution_arn}/*/*"
}


# --- What the site stack reads to route /chat/api/* ---


resource "aws_ssm_parameter" "api_domain" {
  name  = "/neon1-chat/prod/api_domain"
  type  = "String"
  value = local.api_domain
}

resource "aws_ssm_parameter" "origin_secret" {
  name  = "/neon1-chat/prod/origin_secret"
  type  = "SecureString"
  value = random_password.origin_secret.result
}


# --- An email if Bedrock spend passes the monthly budget ---


resource "aws_budgets_budget" "bedrock" {
  name         = local.name
  budget_type  = "COST"
  limit_amount = tostring(var.budget_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "Service"
    values = ["Amazon Bedrock"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.alert_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]
  }
}
