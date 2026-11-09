# infra/tests/inputs.tftest.hcl - Plan-time checks on the stack's inputs, with every provider
# mocked: no AWS credentials or calls. Run with `terraform -chdir=infra test`.

mock_provider "aws" {
  # The account and region feed ARNs; any well-formed values will do
  mock_data "aws_caller_identity" {
    defaults = { account_id = "123456789012" }
  }
  mock_data "aws_region" {
    defaults = { region = "us-east-1" }
  }
  mock_data "aws_iam_policy_document" {
    defaults = { json = "{}" }
  }
}
mock_provider "archive" {}
mock_provider "random" {}

# The production defaults plan cleanly, alarms included
run "defaults" {
  command = plan

  assert {
    condition     = length(aws_cloudwatch_metric_alarm.chat) == 4
    error_message = "expected the four service alarms"
  }
  assert {
    condition     = aws_cloudwatch_metric_alarm.chat["slow"].extended_statistic == "p95" && aws_cloudwatch_metric_alarm.chat["errors"].statistic == "Sum"
    error_message = "latency uses p95 and counts use Sum"
  }
  assert {
    condition     = alltrue([for a in aws_cloudwatch_metric_alarm.chat : a.treat_missing_data == "notBreaching"])
    error_message = "no traffic must not alarm"
  }
}

# concurrency = 0 is the documented pause switch, so it must plan
run "paused" {
  command = plan
  variables { concurrency = 0 }

  assert {
    condition     = aws_lambda_function.chat.reserved_concurrent_executions == 0
    error_message = "concurrency 0 pauses the function"
  }
}

run "zero_per_minute" {
  command = plan
  variables { per_minute = 0 }
  expect_failures = [var.per_minute]
}

run "fractional_per_hour" {
  command = plan
  variables { per_hour = 1.5 }
  expect_failures = [var.per_hour]
}

run "huge_per_day" {
  command = plan
  variables { per_day = 1000000 }
  expect_failures = [var.per_day]
}

run "huge_max_tokens" {
  command = plan
  variables { max_tokens = 60000 }
  expect_failures = [var.max_tokens]
}

run "negative_concurrency" {
  command = plan
  variables { concurrency = -1 }
  expect_failures = [var.concurrency]
}

run "malformed_model" {
  command = plan
  variables { model = "gpt oss" }
  expect_failures = [var.model]
}

run "us_profile_model" {
  command = plan
  variables { model = "us.anthropic.claude-3-5-haiku-20241022-v1:0" }
}

run "zero_budget" {
  command = plan
  variables { budget_usd = 0 }
  expect_failures = [var.budget_usd]
}

run "bad_email" {
  command = plan
  variables { alert_email = "not an address" }
  expect_failures = [var.alert_email]
}
