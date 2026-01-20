# ECS Module - Variables

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs"
  type        = list(string)
}

# Container Images
variable "auth_image" {
  description = "Docker image for auth service"
  type        = string
}

variable "quiz_image" {
  description = "Docker image for quiz service"
  type        = string
}

variable "game_image" {
  description = "Docker image for game service"
  type        = string
}

variable "social_image" {
  description = "Docker image for social service"
  type        = string
}

# Database
variable "db_host" {
  description = "Database host"
  type        = string
}

variable "db_port" {
  description = "Database port"
  type        = number
  default     = 5432
}

variable "db_name" {
  description = "Database name"
  type        = string
}

variable "db_username" {
  description = "Database username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

# Redis
variable "redis_endpoint" {
  description = "Redis endpoint"
  type        = string
}

# Application Secrets
variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

variable "internal_api_key" {
  description = "Internal API key"
  type        = string
  sensitive   = true
}

# OAuth
variable "google_client_id" {
  description = "Google OAuth client ID"
  type        = string
  sensitive   = true
}

variable "google_client_secret" {
  description = "Google OAuth client secret"
  type        = string
  sensitive   = true
}
