"""Client / Tenant Configuration System for Ghost Cursor.

Allows Ghost Cursor to remain 100% agnostic to individual customers,
supporting multi-tenant configurations via:
1. Configuration registry (file-based or environment variables).
2. Per-request overrides from the SDK (clientConfig in CreateRunRequest).
3. Sensible generic defaults for any new customer or application.
"""

import json
import logging
import os
from dataclasses import dataclass, field
from typing import Any, Dict, Optional

logger = logging.getLogger("ghost_cursor.tenant_config")


@dataclass
class TenantConfig:
    """Configuration for a specific tenant / customer deployment."""

    tenant_id: str
    app_name: str = "this application"
    app_type: str = "web application"
    out_of_scope_message: Optional[str] = None
    system_prompt_extra: str = ""
    require_action_approval: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)

    def get_refusal_message(self) -> str:
        """Get the standardized refusal message for this tenant."""
        if self.out_of_scope_message:
            return self.out_of_scope_message
        if self.app_name and self.app_name != "this application":
            return (
                f"This request is out of scope. I can only assist with navigating and using {self.app_name}, "
                "performing on-screen actions, and answering questions related to its functionality."
            )
        return (
            "This request is out of scope. I can only assist with navigating and using this application, "
            "performing on-screen actions, and answering questions related to its functionality."
        )


# Built-in or demo tenant registrations
_TENANT_REGISTRY: Dict[str, TenantConfig] = {
    "shophive_demo": TenantConfig(
        tenant_id="shophive_demo",
        app_name="ShopHive",
        app_type="e-commerce store",
    ),
}

# Load extra tenants from JSON env var if present (e.g. GHOST_TENANTS_CONFIG='{"tenant_123": {"app_name": "Acme CRM"}}')
_raw_json = os.getenv("GHOST_TENANTS_CONFIG", "")
if _raw_json:
    try:
        data = json.loads(_raw_json)
        for tid, cfg in data.items():
            _TENANT_REGISTRY[tid] = TenantConfig(
                tenant_id=tid,
                app_name=cfg.get("app_name", "this application"),
                app_type=cfg.get("app_type", "web application"),
                out_of_scope_message=cfg.get("out_of_scope_message"),
                system_prompt_extra=cfg.get("system_prompt_extra", ""),
                require_action_approval=cfg.get("require_action_approval", True),
                metadata=cfg.get("metadata", {}),
            )
        logger.info(f"Loaded {len(data)} tenant configurations from GHOST_TENANTS_CONFIG")
    except Exception as e:
        logger.warning(f"Failed to parse GHOST_TENANTS_CONFIG: {e}")


def get_tenant_config(tenant_id: str, request_override: Optional[Dict[str, Any]] = None) -> TenantConfig:
    """Retrieve tenant configuration, applying any per-request client overrides.

    If the tenant is unknown, returns a generic TenantConfig so Ghost Cursor
    works out-of-the-box for any customer application.
    """
    base = _TENANT_REGISTRY.get(tenant_id)
    if not base:
        base = TenantConfig(tenant_id=tenant_id)

    if not request_override:
        return base

    req_app_name = request_override.get("appName")
    req_out_of_scope = request_override.get("outOfScopeMessage")

    # If the request provides a custom appName without an outOfScopeMessage,
    # generate the refusal message for the overridden appName rather than inheriting the base
    out_of_scope = req_out_of_scope or (base.out_of_scope_message if not req_app_name else None)

    return TenantConfig(
        tenant_id=tenant_id,
        app_name=req_app_name or base.app_name,
        app_type=request_override.get("appType") or base.app_type,
        out_of_scope_message=out_of_scope,
        system_prompt_extra=base.system_prompt_extra,
        require_action_approval=base.require_action_approval,
        metadata=base.metadata,
    )


def register_tenant(config: TenantConfig) -> None:
    """Dynamically register or update a tenant configuration."""
    _TENANT_REGISTRY[config.tenant_id] = config


def extract_brain_config(brain: str) -> Dict[str, Any]:
    """Extract client application configuration directly from the customer's Brain document (Approach C).

    Supports:
    1. Frontmatter (YAML-style):
       ---
       appName: ShopHive
       appType: footwear and sportswear store
       outOfScopeMessage: I can only help with ShopHive orders and products.
       ---
    2. Markdown directives or headings:
       # ShopHive Platform Overview
       Application Name: ShopHive
       Out-of-Scope Policy: I can only help with ShopHive orders.
    """
    import re

    if not brain:
        return {}

    config: Dict[str, Any] = {}

    # 1. Frontmatter check (--- ... ---), even if preceded by canary marker
    fm_match = re.search(r"(?:^|\n)\s*---\s*\n(.*?)\n---", brain, re.DOTALL)
    if fm_match:
        for line in fm_match.group(1).splitlines():
            line = line.strip()
            if ":" in line:
                k, v = line.split(":", 1)
                k = k.strip().lower()
                v = v.strip().strip("\"'")
                if k in ("appname", "app_name", "application"):
                    config["appName"] = v
                elif k in ("apptype", "app_type", "type"):
                    config["appType"] = v
                elif k in ("outofscopemessage", "out_of_scope_message", "refusalmessage", "refusal_message"):
                    config["outOfScopeMessage"] = v

    # 2. Check for explicit directives anywhere in platform brain
    if not config.get("appName"):
        app_match = re.search(
            r"^[#>*\s]*(?:Application\s+Name|App\s+Name|Platform\s+Name)\s*:\s*(.+)$",
            brain,
            re.MULTILINE | re.IGNORECASE,
        )
        if app_match:
            config["appName"] = app_match.group(1).strip().strip("\"'")

    if not config.get("appType"):
        type_match = re.search(
            r"^[#>*\s]*(?:Application\s+Type|App\s+Type|Platform\s+Type)\s*:\s*(.+)$",
            brain,
            re.MULTILINE | re.IGNORECASE,
        )
        if type_match:
            config["appType"] = type_match.group(1).strip().strip("\"'")

    if not config.get("outOfScopeMessage"):
        refusal_match = re.search(
            r"^[#>*\s]*(?:Out-of-Scope\s+Policy|Refusal\s+Message|Out-of-Scope\s+Message)\s*:\s*(.+)$",
            brain,
            re.MULTILINE | re.IGNORECASE,
        )
        if refusal_match:
            config["outOfScopeMessage"] = refusal_match.group(1).strip().strip("\"'")

    # 3. Heading extraction: first top-level `# <App> Platform Overview` or `# <App>`
    if not config.get("appName"):
        for line in brain.splitlines():
            line = line.strip()
            if line.startswith("# ") and not line.startswith("<!--"):
                heading = line[2:].strip()
                if "canary" in heading.lower() or heading.lower() in ("platform", "overview", "documentation"):
                    continue
                clean_name = re.sub(
                    r"\s+(Platform\s+Overview|Overview|Knowledge\s+Base|Documentation)$",
                    "",
                    heading,
                    flags=re.IGNORECASE,
                ).strip()
                if clean_name:
                    config["appName"] = clean_name
                    break

    return config

