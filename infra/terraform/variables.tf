variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "target_vpc_id" {
  type    = string
  default = "vpc-0c6f4ed3e224cba0a" # existing Default VPC
}

variable "target_subnet_id" {
  type    = string
  default = "subnet-0a08ddb58520a5a2e" # existing Subnet
}

variable "key_name" {
  type    = string
  default = "pipeline-fresh-key"
}