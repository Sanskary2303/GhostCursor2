terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# 1. Custom VPC Network for Private SQL and Egress
resource "google_compute_network" "vpc" {
  name                    = "ghost-cursor-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name          = "ghost-cursor-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
}

# 2. Secret Manager for Tenant Credentials
resource "google_secret_manager_secret" "tenant_keys" {
  secret_id = "ghost-cursor-tenant-keys"
  replication {
    auto {}
  }
}

# 3. Cloud Run Service for Ghost Cursor Cloud Orchestrator
resource "google_cloud_run_v2_service" "orchestrator" {
  name     = "ghost-cursor-api"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  template {
    scaling {
      min_instance_count = 0
      max_instance_count = 5
    }

    containers {
      image = var.orchestrator_image

      resources {
        limits = {
          cpu    = "1000m"
          memory = "1Gi"
        }
      }

      env {
        name  = "PORT"
        value = "8080"
      }

      env {
        name  = "GCP_PROJECT"
        value = var.project_id
      }
    }
  }
}

# 4. Cloud Run Service for ShopHive Customer Demo App
resource "google_cloud_run_v2_service" "shophive_demo" {
  name     = "shophive-demo"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = 0
      max_instance_count = 1
    }

    containers {
      image = var.shophive_image

      resources {
        limits = {
          cpu    = "1000m"
          memory = "1Gi"
        }
      }

      env {
        name  = "GHOST_CURSOR_SERVICE_URL"
        value = google_cloud_run_v2_service.orchestrator.uri
      }
    }
  }
}

