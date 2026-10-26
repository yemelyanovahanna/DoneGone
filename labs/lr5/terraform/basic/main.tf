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

variable "ami_id" {
  type        = string
  description = "An existing Amazon Linux x86_64 AMI in aws_region; supply before a real AWS plan."

}

resource "aws_instance" "web" {

  ami           = var.ami_id
  instance_type = "t3.micro"
  tags = {
    Name = "lr5-basic-web"
  }


}

output "public_ip" {
  value = aws_instance.web.public_ip
}
