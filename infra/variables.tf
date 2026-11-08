# infra/variables.tf - The model, caps, and alert address. Defaults are production values.


# Bedrock inference profile and the foundation model behind it
variable "model_profile" {
  description = "Bedrock inference profile the function calls."
  type        = string
  default     = "us.amazon.nova-micro-v1:0"
}

variable "model_id" {
  description = "Foundation model behind the inference profile, for the IAM policy."
  type        = string
  default     = "amazon.nova-micro-v1:0"
}

variable "max_tokens" {
  description = "Longest reply, in tokens."
  type        = number
  default     = 400
}


# Spend guards: per visitor per hour, site-wide per day, and concurrent runs
variable "per_hour" {
  description = "Questions one visitor may ask in an hour."
  type        = number
  default     = 20
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
