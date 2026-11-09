# infra/variables.tf - The model, caps, and alert address. Defaults are production values.
#
# Each number is checked at plan time: a cap of zero, a fraction, or a typo with extra digits
# fails the plan instead of breaking the function or its spend bounds. The one deliberate
# exception is concurrency = 0, which is the switch that pauses the assistant (see README).


# The Bedrock model the function calls: a model ID, or a "us." cross-region inference profile
variable "model" {
  description = "Bedrock model ID or US inference profile ID."
  type        = string
  default     = "openai.gpt-oss-120b-1:0"

  # provider.model-name[:version], optionally behind "us."; anything else would build a bad ARN
  validation {
    condition     = can(regex("^(us\\.)?[a-z0-9-]+\\.[a-z0-9.-]+(:[0-9]+)?$", var.model))
    error_message = "model must be a Bedrock model ID such as openai.gpt-oss-120b-1:0, optionally prefixed with \"us.\"."
  }
}

# The function also refuses a non-positive or fractional cap at run time, before any model call
variable "max_tokens" {
  description = "Longest reply, in tokens."
  type        = number
  default     = 600

  validation {
    condition     = floor(var.max_tokens) == var.max_tokens && var.max_tokens >= 100 && var.max_tokens <= 4096
    error_message = "max_tokens must be a whole number from 100 to 4096."
  }
}


# Some warmth so Neo words things freshly each time; the prompt, not a zero, keeps it grounded
variable "temperature" {
  description = "Sampling temperature for replies, from 0 (always the same words) to 1."
  type        = number
  default     = 0.7

  validation {
    condition     = var.temperature >= 0 && var.temperature <= 1
    error_message = "temperature must be from 0 to 1."
  }
}


# Spend guards: per visitor per minute and per hour, site-wide per day, and concurrent runs
variable "per_minute" {
  description = "Questions one visitor may ask in a minute before being asked to slow down."
  type        = number
  default     = 6

  validation {
    condition     = floor(var.per_minute) == var.per_minute && var.per_minute >= 1 && var.per_minute <= 60
    error_message = "per_minute must be a whole number from 1 to 60."
  }
}

variable "per_hour" {
  description = "Questions one visitor may ask in an hour."
  type        = number
  default     = 60

  validation {
    condition     = floor(var.per_hour) == var.per_hour && var.per_hour >= 1 && var.per_hour <= 1000
    error_message = "per_hour must be a whole number from 1 to 1000."
  }
}

variable "per_day" {
  description = "Questions the whole site may ask in a day."
  type        = number
  default     = 500

  validation {
    condition     = floor(var.per_day) == var.per_day && var.per_day >= 1 && var.per_day <= 10000
    error_message = "per_day must be a whole number from 1 to 10000."
  }
}

# 0 is allowed on purpose: Lambda then runs no instances, every question gets a short error, and
# the site and 1NEON carry on with their contact links. It is the pause switch, not a mistake
variable "concurrency" {
  description = "Most function instances running at once; 0 pauses the assistant."
  type        = number
  default     = 5

  validation {
    condition     = floor(var.concurrency) == var.concurrency && var.concurrency >= 0 && var.concurrency <= 20
    error_message = "concurrency must be a whole number from 0 (paused) to 20."
  }
}


# Monthly Bedrock budget and who hears about it
variable "budget_usd" {
  description = "Monthly Bedrock spend that triggers an email."
  type        = number
  default     = 5

  validation {
    condition     = var.budget_usd > 0 && var.budget_usd <= 1000
    error_message = "budget_usd must be more than 0 and at most 1000."
  }
}

variable "alert_email" {
  description = "Address for budget and service alerts."
  type        = string
  default     = "neon1llc@gmail.com"

  validation {
    condition     = can(regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", var.alert_email))
    error_message = "alert_email must be an email address."
  }
}


# Only during an origin secret rotation: the old value, accepted until the site stack sends the new
# one. Pass it with TF_VAR_origin_secret_previous for that one apply, then apply again without it
variable "origin_secret_previous" {
  description = "Previous origin secret, accepted alongside the current one during a rotation."
  type        = string
  default     = ""
  sensitive   = true
}
