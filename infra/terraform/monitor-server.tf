resource "aws_instance" "monitor_server" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = "t3a.small"
  subnet_id              = var.target_subnet_id
  key_name               = aws_key_pair.generated_key.key_name
  vpc_security_group_ids = [aws_security_group.pipeline_sg.id]

  root_block_device {
    volume_size           = 20
    volume_type           = "gp3"
    delete_on_termination = true
  }

  tags = {
    Name = "observability-monitoring-node"
  }
}