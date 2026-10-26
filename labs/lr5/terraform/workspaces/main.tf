terraform {

  required_version = ">= 1.10, < 2.0"
  required_providers {

    aws = {
      source = "hashicorp/aws", version = "~> 5.0"
    }


  }


}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "us-east-1"

}

# Local backend for the no-AWS exercise. Enable backend.s3.tf.example only with real AWS resources.
locals {

  instance_types = {
    default = "t3.micro", dev = "t3.micro", staging = "t3.small", prod = "t3.medium"
  }


}

resource "terraform_data" "environment" {

  input = {
    environment = terraform.workspace, instance_type = local.instance_types[terraform.workspace]
  }


}

output "environment" {
  value = terraform_data.environment.output
}
