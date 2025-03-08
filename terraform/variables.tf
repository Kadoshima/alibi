variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "ap-northeast-1" # 東京リージョン
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name used as prefix for resources"
  type        = string
  default     = "photo-marketplace"
}

variable "domain_name" {
  description = "Domain name for the API"
  type        = string
  default     = ""
}

variable "lambda_runtime" {
  description = "Lambda runtime to use"
  type        = string
  default     = "nodejs18.x"
}

variable "lambda_timeout" {
  description = "Lambda timeout in seconds"
  type        = string
  default     = "30"
}

variable "lambda_memory_size" {
  description = "Lambda memory size in MB"
  type        = string
  default     = "128"
}

variable "email_sender" {
  description = "Email address to use as sender for notifications"
  type        = string
  default     = "noreply@example.com"
}