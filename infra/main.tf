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

  # A "us." profile may route to any US region's copy of the model; a plain ID stays here
  profile  = startswith(var.model, "us.")
  model_id = trimprefix(var.model, "us.")
  model_arns = local.profile ? concat(
    ["arn:aws:bedrock:${local.region}:${local.account}:inference-profile/${var.model}"],
    [for r in ["us-east-1", "us-east-2", "us-west-2"] : "arn:aws:bedrock:${r}::foundation-model/${local.model_id}"],
  ) : ["arn:aws:bedrock:${local.region}::foundation-model/${var.model}"]
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


# --- The function: the release folder scripts/package.mjs stages ---


# Source, the corpus its manifest lists, the AWS SDK at the lockfile's exact versions (the ones
# the tests ran against), and release.json naming the commit and corpus. Run
# `node scripts/package.mjs` before planning; without it the plan stops here
data "archive_file" "app" {
  type        = "zip"
  source_dir  = "${path.module}/.build/app"
  output_path = "${path.module}/.build/app.zip"
}

# Two weeks of logs is enough to debug; message text is never logged
resource "aws_cloudwatch_log_group" "chat" {
  name              = "/aws/lambda/${local.name}"
  retention_in_days = 14
}

resource "aws_iam_role" "chat" {
  name = local.name

  # The ceiling neon1-aws-infrastructure sets for this role; the deploy role can only create or
  # change this role with it attached, so nothing granted here can exceed it
  permissions_boundary = "arn:aws:iam::${local.account}:policy/neon1-boundary-chat"

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

  # The one model the assistant uses (and, for a US profile, its copies in each US region)
  statement {
    sid       = "Model"
    actions   = ["bedrock:InvokeModel"]
    resources = local.model_arns
  }

  statement {
    sid       = "Counters"
    # Read a visitor's strike record, and count
    actions   = ["dynamodb:GetItem", "dynamodb:UpdateItem"]
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
      MODEL_ID      = var.model
      MAX_TOKENS    = tostring(var.max_tokens)
      TEMPERATURE   = tostring(var.temperature)
      TABLE_NAME    = aws_dynamodb_table.counters.name
      PER_MINUTE    = tostring(var.per_minute)
      PER_HOUR      = tostring(var.per_hour)
      PER_DAY       = tostring(var.per_day)
      ORIGIN_SECRET = random_password.origin_secret.result
      # Set only while rotating (README): the value CloudFront still sends until the site applies
      ORIGIN_SECRET_PREVIOUS = var.origin_secret_previous
      HASH_SALT              = random_password.hash_salt.result
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


# --- A few service alarms, emailed to the same address ---
#
# Four signals cover the ways the assistant goes wrong for visitors: answers that fail (store,
# model, or deadline), crashes or timeouts, throttling, and slowness. Missing data counts as fine,
# so a quiet day with no questions never alarms. Metrics carry counts and times only, never text.
# The email subscription must be confirmed once from the inbox before alerts arrive.


resource "aws_sns_topic" "alerts" {
  name = "${local.name}-alerts"
}

resource "aws_sns_topic_subscription" "alerts" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# The handler logs each failed answer as one line naming its event (never the question), so a
# count of those lines is the failure rate visitors see
resource "aws_cloudwatch_log_metric_filter" "failures" {
  name           = "${local.name}-failures"
  log_group_name = aws_cloudwatch_log_group.chat.name
  pattern        = "?chat_error ?limit_error ?handler_error ?config_error"

  metric_transformation {
    name      = "Failures"
    namespace = "neon1-chat"
    value     = "1"
  }
}

locals {
  # Each alarm: its metric, statistic, threshold, and window. A short burst is noise; these ask
  # for a sustained problem before sending an email
  alarms = {
    failures = { namespace = "neon1-chat", metric = "Failures", stat = "Sum", threshold = 5, period = 900, periods = 1, about = "Five or more questions failed (store, model, or deadline) within 15 minutes." }
    errors   = { namespace = "AWS/Lambda", metric = "Errors", stat = "Sum", threshold = 3, period = 900, periods = 1, about = "The function crashed or timed out three or more times within 15 minutes." }
    throttle = { namespace = "AWS/Lambda", metric = "Throttles", stat = "Sum", threshold = 5, period = 900, periods = 1, about = "Five or more requests were throttled within 15 minutes; expected while paused with concurrency = 0." }
    slow     = { namespace = "AWS/Lambda", metric = "Duration", stat = "p95", threshold = 12000, period = 300, periods = 3, about = "The slowest 5% of requests took over 12 seconds for 15 minutes, close to the 15-second deadline." }
  }
}

resource "aws_cloudwatch_metric_alarm" "chat" {
  for_each = local.alarms

  alarm_name          = "${local.name}-${each.key}"
  alarm_description   = each.value.about
  namespace           = each.value.namespace
  metric_name         = each.value.metric
  dimensions          = each.value.namespace == "AWS/Lambda" ? { FunctionName = aws_lambda_function.chat.function_name } : null
  statistic           = each.value.stat == "p95" ? null : each.value.stat
  extended_statistic  = each.value.stat == "p95" ? "p95" : null
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = each.value.threshold
  period              = each.value.period
  evaluation_periods  = each.value.periods
  datapoints_to_alarm = each.value.periods
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
}
