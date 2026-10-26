# OFFLINE MOCK TEST: validates a simulated plan, not an AWS deployment.
mock_provider "aws" {
  mock_data "aws_availability_zones" {
    defaults = { names = ["us-east-1a", "us-east-1b"] }
  }
  mock_data "aws_ami" {
    defaults = { id = "ami-0123456789abcdef0" }
  }
}
run "offline_plan" {
  command = plan
  assert {
    condition     = module.vpc.vpc_cidr == "10.10.0.0/16"
    error_message = "Incorrect environment network"
  }
}
