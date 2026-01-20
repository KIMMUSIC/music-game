# Music Quiz Game - Terraform Variables

variable "aws_region" {
  description = "AWS region to deploy to"
  type        = string
  default     = "ap-northeast-2"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "musicquiz"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# Database Configuration
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "music_quiz"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "postgres"
  sensitive   = true
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

# Redis Configuration
variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

# Container Images
variable "auth_image" {
  description = "Docker image for auth service"
  type        = string
  default     = ""
}

variable "quiz_image" {
  description = "Docker image for quiz service"
  type        = string
  default     = ""
}

variable "game_image" {
  description = "Docker image for game service"
  type        = string
  default     = ""
}

variable "social_image" {
  description = "Docker image for social service"
  type        = string
  default     = ""
}

# Application Secrets
variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

variable "internal_api_key" {
  description = "Internal API key for service-to-service communication"
  type        = string
  sensitive   = true
}

# OAuth Configuration
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
