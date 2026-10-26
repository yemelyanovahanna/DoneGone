# OFFLINE MOCK TEST: validates a simulated plan, not an AWS deployment.
mock_provider "aws" {
  mock_data "aws_availability_zones" {
    defaults = { names = ["us-east-1a", "us-east-1b"] }
  }
  mock_data "aws_ami" {
    defaults = { id = "ami-0123456789abcdef0" }
  }
}
mock_provider "random" {}
run "offline_plan" {
  command = plan
  assert {
    condition     = aws_dynamodb_table.locks.hash_key == "LockID"
    error_message = "DynamoDB lock key must be LockID"
  }
}
