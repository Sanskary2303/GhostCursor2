variable "project_id" {
  type        = string
  description = "GCP Project ID"
  default     = "ghost-cursor-prod"
}

variable "region" {
  type        = string
  description = "GCP Region"
  default     = "us-central1"
}

variable "orchestrator_image" {
  type        = string
  description = "Container image URI for orchestrator"
  default     = "us-central1-docker.pkg.dev/ghost-cursor-prod/ghost-cursor/api:latest"
}

variable "shophive_image" {
  type        = string
  description = "Container image URI for ShopHive demo"
  default     = "us-central1-docker.pkg.dev/ghost-cursor-prod/ghost-cursor/shophive:latest"
}

