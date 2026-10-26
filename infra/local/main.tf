terraform {

  required_version = ">= 1.10, < 2.0"
  required_providers {

    docker = {
      source = "kreuzwerker/docker", version = "~> 3.6"
    }

    random = {
      source = "hashicorp/random", version = "~> 3.7"
    }


  }


}

variable "docker_host" {
  type = string
}

variable "name_prefix" {
  type    = string
  default = "donegone-stage4"

}

provider "docker" {
  host = var.docker_host
}

resource "random_password" "db" {
  length  = 32
  special = false

}

resource "random_password" "jwt" {
  length  = 48
  special = false

}

resource "random_password" "grafana" {
  length  = 32
  special = false

}

locals {
  root = abspath("${path.module}/../..")
}

resource "docker_network" "app" {
  name = "${var.name_prefix}-network"
}

resource "docker_volume" "data" {

  for_each = toset(["postgres", "prometheus", "grafana"])
  name     = "${var.name_prefix}-${each.key}"

}

resource "docker_image" "backend" {

  name         = "donegone-backend:stage4"
  keep_locally = true


}

resource "docker_image" "frontend" {

  name         = "donegone-frontend:stage4"
  keep_locally = true


}

resource "docker_image" "external" {

  for_each = {
    db = "postgres:15-alpine", prometheus = "prom/prometheus:v3.5.0", grafana = "grafana/grafana:12.2.0", blackbox = "prom/blackbox-exporter:v0.27.0"
  }

  name         = each.value
  keep_locally = true

}

resource "docker_container" "db" {

  name  = "${var.name_prefix}-db"
  image = docker_image.external["db"].image_id
  env   = ["POSTGRES_USER=donegone", "POSTGRES_DB=donegone", "POSTGRES_PASSWORD=${random_password.db.result}"]
  networks_advanced {
    name    = docker_network.app.name
    aliases = ["db"]

  }

  volumes {
    volume_name    = docker_volume.data["postgres"].name
    container_path = "/var/lib/postgresql/data"

  }

  volumes {
    host_path      = "${local.root}/database/init.sql"
    container_path = "/docker-entrypoint-initdb.d/01-init.sql"
    read_only      = true

  }

  healthcheck {
    test     = ["CMD-SHELL", "pg_isready -U donegone -d donegone"]
    interval = "2s"
    timeout  = "3s"
    retries  = 30

  }

  wait         = true
  wait_timeout = 180

}

resource "docker_container" "backend" {

  name       = "${var.name_prefix}-backend"
  image      = docker_image.backend.image_id
  depends_on = [docker_container.db]
  env        = ["PORT=3000", "DATABASE_URL=postgresql://donegone:${random_password.db.result}@db:5432/donegone", "JWT_SECRET=${random_password.jwt.result}"]
  networks_advanced {
    name    = docker_network.app.name
    aliases = ["backend"]

  }


}

resource "docker_container" "frontend" {

  name       = "${var.name_prefix}-frontend"
  image      = docker_image.frontend.image_id
  depends_on = [docker_container.backend]
  ports {
    internal = 80
    external = 8085
    ip       = "127.0.0.1"

  }

  networks_advanced {
    name = docker_network.app.name
  }


}

resource "docker_container" "blackbox" {

  name    = "${var.name_prefix}-blackbox"
  image   = docker_image.external["blackbox"].image_id
  command = ["--config.file=/etc/blackbox.yml"]
  volumes {
    host_path      = "${local.root}/monitoring/blackbox.yml"
    container_path = "/etc/blackbox.yml"
    read_only      = true

  }

  networks_advanced {
    name    = docker_network.app.name
    aliases = ["blackbox"]

  }


}

resource "docker_container" "prometheus" {

  name       = "${var.name_prefix}-prometheus"
  image      = docker_image.external["prometheus"].image_id
  depends_on = [docker_container.backend, docker_container.blackbox]
  ports {
    internal = 9090
    external = 9095
    ip       = "127.0.0.1"

  }

  volumes {
    host_path      = "${local.root}/monitoring/prometheus.yml"
    container_path = "/etc/prometheus/prometheus.yml"
    read_only      = true

  }

  volumes {
    volume_name    = docker_volume.data["prometheus"].name
    container_path = "/prometheus"

  }

  networks_advanced {
    name    = docker_network.app.name
    aliases = ["prometheus"]

  }


}

resource "docker_container" "grafana" {

  name       = "${var.name_prefix}-grafana"
  image      = docker_image.external["grafana"].image_id
  env        = ["GF_SECURITY_ADMIN_USER=admin", "GF_SECURITY_ADMIN_PASSWORD=${random_password.grafana.result}", "GF_USERS_ALLOW_SIGN_UP=false"]
  depends_on = [docker_container.prometheus]
  ports {
    internal = 3000
    external = 3005
    ip       = "127.0.0.1"

  }

  volumes {
    host_path      = "${local.root}/monitoring/grafana/provisioning"
    container_path = "/etc/grafana/provisioning"
    read_only      = true

  }

  volumes {
    host_path      = "${local.root}/monitoring/grafana/dashboards"
    container_path = "/var/lib/grafana/dashboards"
    read_only      = true

  }

  volumes {
    volume_name    = docker_volume.data["grafana"].name
    container_path = "/var/lib/grafana"

  }

  networks_advanced {
    name = docker_network.app.name
  }


}

output "app_url" {
  value = "http://127.0.0.1:8085"
}

output "prometheus_url" {
  value = "http://127.0.0.1:9095"
}

output "grafana_url" {
  value = "http://127.0.0.1:3005/d/donegone-stage4"
}

output "grafana_password" {
  value     = random_password.grafana.result
  sensitive = true

}
