# infra/variables.tf - The model, caps, and alert address. Defaults are production values.


# The Bedrock model the function calls: a model ID, or a "us." cross-region inference profile
variable "model" {
  description = "Bedrock model ID or US inference profile ID."
  type        = string
  default     = "openai.gpt-oss-120b-1:0"
}

variable "max_tokens" {
  description = "Longest reply, in tokens."
  type        = number
  default     = 600
}


# Spend guards: per visitor per minute and per hour, site-wide per day, and concurrent runs
variable "per_minute" {
  description = "Questions one visitor may ask in a minute before being asked to slow down."
  type        = number
  default     = 6
}

variable "per_hour" {
  description = "Questions one visitor may ask in an hour."
  type        = number
  default     = 60
}

variable "per_day" {
  description = "Questions the whole site may ask in a day."
  type        = number
  default     = 500
}

variable "concurrency" {
  description = "Most function instances running at once."
  type        = number
  default     = 5
}


# Monthly Bedrock budget and who hears about it
variable "budget_usd" {
  description = "Monthly Bedrock spend that triggers an email."
  type        = number
  default     = 5
}

variable "alert_email" {
  description = "Address for budget alerts."
  type        = string
  default     = "neon1llc@gmail.com"
}
