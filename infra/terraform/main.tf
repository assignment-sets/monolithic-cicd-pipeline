# Dynamically capture your home machine's public IP
data "http" "my_public_ip" {
  url = "https://ipv4.icanhazip.com"
}

# Fetch the latest official canonical Ubuntu 24.04 LTS AMI image
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Generate secure cryptographic key pair locally
resource "tls_private_key" "custom_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Register the public key profile with AWS
resource "aws_key_pair" "generated_key" {
  key_name   = var.key_name
  public_key = tls_private_key.custom_key.public_key_openssh
}

# Output the private key file directly into your local directory securely
resource "local_file" "private_key_pem" {
  content         = tls_private_key.custom_key.private_key_pem
  filename        = "${path.module}/${var.key_name}.pem"
  file_permission = "0400"
}

# The Single Shared Security Group
resource "aws_security_group" "pipeline_sg" {
  name        = "monolithic-pipeline-shared-sg"
  description = "Shared perimeter defense for Jenkins, NextApp, and Monitoring nodes"
  vpc_id      = var.target_vpc_id

  # 1. ALLOW FULL INTERNAL INTER-SERVER COMMUNICATION
  ingress {
    description = "Allow all nodes in this group to talk freely to each other privately"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    self        = true 
  }

  # 2. PUBLIC SECURE SSH (Restricted to your home IP only)
  ingress {
    description = "SSH access point"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["${chomp(data.http.my_public_ip.response_body)}/32"]
  }

  # 3. JENKINS DASHBOARD PORT (Restricted to your home IP only)
  ingress {
    description = "Jenkins web UI portal"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # 4. GRAFANA DASHBOARD PORT (Restricted to your home IP only)
  ingress {
    description = "Grafana visualization panel UI"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["${chomp(data.http.my_public_ip.response_body)}/32"]
  }

  # 5. OPEN WEB PORT (Open to world for your application proxy)
  ingress {
    description = "Public HTTP web traffic entry point"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # OUTBOUND STANDARD EGRESS RULE
  egress {
    description = "Allow all outbound dependencies to download cleanly"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "pipeline-shared-security-group"
  }
}

# --- OUTPUT BLOCK FOR EASY COPY PASTE COMPILATION ---

output "jenkins_public_ip" {
  value = aws_instance.jenkins_server.public_ip
}

output "app_server_private_ip" {
  value = aws_instance.app_server.private_ip
}

output "app_server_public_ip" {
  value = aws_instance.app_server.public_ip
}

output "monitoring_server_public_ip" {
  value = aws_instance.monitor_server.public_ip
}

output "ssh_connect_jenkins" {
  value = "ssh -i ${local_file.private_key_pem.filename} ubuntu@${aws_instance.jenkins_server.public_ip}"
}

output "ssh_connect_app" {
  value = "ssh -i ${local_file.private_key_pem.filename} ubuntu@${aws_instance.app_server.public_ip}"
}

output "ssh_connect_monitoring" {
  value = "ssh -i ${local_file.private_key_pem.filename} ubuntu@${aws_instance.monitor_server.public_ip}"
}