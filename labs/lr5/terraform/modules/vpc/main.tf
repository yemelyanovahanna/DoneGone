terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws", version = "~> 5.0"
    }

  }

}

variable "vpc_cidr" {
  type        = string
  description = "VPC CIDR"
  default     = "10.0.0.0/16"

}

variable "environment" {
  type        = string
  description = "Environment name"

}

variable "public_subnets" {
  type        = list(string)
  description = "Public subnet CIDRs"
  default     = ["10.0.1.0/24", "10.0.2.0/24"]

}

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "main" {

  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = {
    Name = "${var.environment}-vpc", Environment = var.environment
  }


}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags = {
    Name = "${var.environment}-igw", Environment = var.environment
  }


}

resource "aws_subnet" "public" {

  count                   = length(var.public_subnets)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnets[count.index]
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags = {
    Name = "${var.environment}-public-${count.index + 1}", Environment = var.environment
  }


}

resource "aws_route_table" "public" {

  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id

  }

  tags = {
    Name = "${var.environment}-public-rt", Environment = var.environment
  }


}

resource "aws_route_table_association" "public" {

  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id

}

output "vpc_id" {
  description = "VPC identifier"
  value       = aws_vpc.main.id

}

output "public_subnet_ids" {
  description = "Public subnet identifiers"
  value       = aws_subnet.public[*].id

}

output "vpc_cidr" {
  description = "VPC address range"
  value       = aws_vpc.main.cidr_block

}
