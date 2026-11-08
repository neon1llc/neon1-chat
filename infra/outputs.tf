# infra/outputs.tf - What the site stack and a person checking the deploy need.


output "api_domain" {
  description = "HTTP API domain the neon1.tech distribution forwards /chat/api/* to."
  value       = local.api_domain
}

output "function_name" {
  description = "The chat function."
  value       = aws_lambda_function.chat.function_name
}
