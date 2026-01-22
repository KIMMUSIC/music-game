# Music Quiz Game - Terraform Infrastructure
# Main configuration file

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment to use S3 backend for state management
  backend "s3" {
     bucket         = "musicquiz-terraform-state"
     key            = "terraform.tfstate"
     region         = "ap-northeast-2"
     encrypt        = true
     dynamodb_table = "musicquiz-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "MusicQuiz"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  project_name = var.project_name
  environment  = var.environment
  vpc_cidr     = var.vpc_cidr
}

# RDS PostgreSQL Module
module "rds" {
  source = "./modules/rds"

  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  db_instance_class  = var.db_instance_class
  db_name            = var.db_name
  db_username        = var.db_username
  db_password        = var.db_password

  depends_on = [module.vpc]
}

# ElastiCache Redis Module
module "elasticache" {
  source = "./modules/elasticache"

  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  node_type          = var.redis_node_type

  depends_on = [module.vpc]
}

# ECS Cluster and Services Module
module "ecs" {
  source = "./modules/ecs"

  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  public_subnet_ids  = module.vpc.public_subnet_ids
  private_subnet_ids = module.vpc.private_subnet_ids

  # Service images
  auth_image   = var.auth_image
  quiz_image   = var.quiz_image
  game_image   = var.game_image
  social_image = var.social_image

  # Database connection
  db_host     = module.rds.db_endpoint
  db_port     = module.rds.db_port
  db_name     = var.db_name
  db_username = var.db_username
  db_password = var.db_password

  # Redis connection
  redis_endpoint = module.elasticache.redis_endpoint

  # Application secrets
  jwt_secret       = var.jwt_secret
  internal_api_key = var.internal_api_key

  # OAuth
  google_client_id     = var.google_client_id
  google_client_secret = var.google_client_secret

  depends_on = [module.vpc, module.rds, module.elasticache]
}
