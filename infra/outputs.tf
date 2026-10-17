output "orchestrator_uri" {
  value       = google_cloud_run_v2_service.orchestrator.uri
  description = "Ghost Cursor Cloud Orchestrator Cloud Run URI"
}

output "shophive_uri" {
  value       = google_cloud_run_v2_service.shophive_demo.uri
  description = "ShopHive Customer Demo Cloud Run URI"
}

