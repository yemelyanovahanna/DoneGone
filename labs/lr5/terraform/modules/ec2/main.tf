terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws", version = "~> 5.0"
    }

  }

}

variable "instance_type" {
  type        = string
  description = "EC2 instance type"
  default     = "t3.micro"

}

variable "subnet_id" {
  type        = string
  description = "Public subnet ID"

}

variable "vpc_id" {
  type        = string
  description = "VPC ID"

}

variable "environment" {
  type        = string
  description = "Environment name"

}

data "aws_ami" "amazon_linux" {

  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-2023*-x86_64"]

  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]

  }


}

resource "aws_security_group" "web" {

  name   = "${var.environment}-web-sg"
  vpc_id = var.vpc_id
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]

  }

  # No SSH ingress is needed for this lab.
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]

  }

  tags = {
    Environment = var.environment
  }


}

resource "aws_instance" "web" {

  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [aws_security_group.web.id]
  tags = {
    Name = "${var.environment}-web", Environment = var.environment
  }


}

output "instance_id" {
  description = "Instance identifier"
  value       = aws_instance.web.id

}

output "public_ip" {
  description = "Public IP address"
  value       = aws_instance.web.public_ip

}
