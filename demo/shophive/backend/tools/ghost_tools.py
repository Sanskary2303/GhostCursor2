"""Customer-registered read-only tools for ShopHive.

Exposes domain-specific APIs to the Ghost Cursor AI Co-pilot via
the Gateway Loopback (Reverse-Dispatch) protocol.
"""

from typing import Any, Dict
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Typed parameter models with explicit descriptions
# ---------------------------------------------------------------------------
class OrderQuery(BaseModel):
    order_id: str = Field(description="Order ID to lookup, e.g. 'SH-1024' or 'ORD-20241001-A7X'")


class StockQuery(BaseModel):
    sku: str = Field(description="Product SKU code, e.g. 'NK-AM90-01' or 'AJ1-HIGH-01'")
    size: str = Field(description="Shoe size, e.g. '10' or '11.5'")


class DiscountRoiQuery(BaseModel):
    promo_code: str = Field(description="Promotional discount code, e.g. 'SAVE20' or 'FREESHIP'")
    subtotal: float = Field(description="Order or cart subtotal in USD")


# ---------------------------------------------------------------------------
# Mock database/warehouse data
# ---------------------------------------------------------------------------
MOCK_ORDERS: Dict[str, dict] = {
    "SH-1024": {
        "order_id": "SH-1024",
        "status": "Shipped",
        "date": "2024-10-24",
        "items": [{"name": "Air Max 90", "size": "10", "price": 129.99}],
        "total": 140.71,
        "carrier": "FedEx Express",
        "tracking_number": "1Z999SH10247890123",
        "estimated_delivery": "October 28, 2024",
    },
    "ORD-20241001-A7X": {
        "order_id": "ORD-20241001-A7X",
        "status": "Delivered",
        "date": "2024-10-01",
        "items": [
            {"name": "Air Max 90", "size": "10", "price": 129.99},
            {"name": "Chuck Taylor All Star", "size": "10", "price": 64.99},
        ],
        "total": 211.07,
        "carrier": "UPS Ground",
        "tracking_number": "1Z999AA10123456784",
        "delivery_date": "October 5, 2024",
    },
}

MOCK_INVENTORY: Dict[str, Dict[str, int]] = {
    "NK-AM90-01": {"8": 5, "8.5": 8, "9": 12, "9.5": 14, "10": 20, "10.5": 7, "11": 4, "12": 2},
    "AJ1-HIGH-01": {"8": 2, "8.5": 3, "9": 5, "9.5": 0, "10": 8, "10.5": 4, "11": 10, "12": 1},
    "UB-23-01": {"8": 10, "8.5": 10, "9": 15, "9.5": 18, "10": 25, "10.5": 12, "11": 8, "12": 5},
}


# ---------------------------------------------------------------------------
# Tool Registration
# ---------------------------------------------------------------------------
def register_shophive_tools(ghost: Any) -> None:
    """Register ShopHive customer backend read-only tools on the Ghost Cursor backend instance."""

    @ghost.register_tool(
        name="lookup_order",
        description="Checks order status, shipment tracking, and items for the authenticated user",
        schema=OrderQuery,
        read_only=True,
    )
    async def lookup_order(params: OrderQuery, context: dict) -> dict:
        user_id = context.get("user_id")  # Injected authentic user identity
        order = MOCK_ORDERS.get(params.order_id.upper())
        if not order:
            # Fallback mock for demonstration
            return {
                "order_id": params.order_id,
                "status": "In Transit",
                "carrier": "UPS Ground",
                "estimated_delivery": "Within 2 business days",
                "note": "Standard verified order for user " + str(user_id),
            }
        return order

    @ghost.register_tool(
        name="check_warehouse_stock",
        description="Checks live warehouse inventory count for a specific shoe SKU and size",
        schema=StockQuery,
        read_only=True,
    )
    async def check_warehouse_stock(params: StockQuery, context: dict) -> dict:
        sku = params.sku.upper()
        size = str(params.size)
        stock_map = MOCK_INVENTORY.get(sku, {"10": 15, "9.5": 8, "11": 6})
        available = stock_map.get(size, 5)
        return {
            "sku": sku,
            "size": size,
            "available_units": available,
            "in_stock": available > 0,
        }

    @ghost.register_tool(
        name="simulate_discount_roi",
        description="Calculates business margin sensitivity and break-even thresholds for promotional discounts",
        schema=DiscountRoiQuery,
        read_only=True,
    )
    async def simulate_discount_roi(params: DiscountRoiQuery, context: dict) -> dict:
        code = params.promo_code.upper()
        subtotal = params.subtotal
        if code == "SAVE20":
            discount_pct = 20
            margin_impact = -6.5
            breakeven_increase = "+18% order volume required"
        elif code == "FREESHIP":
            discount_pct = 5.5
            margin_impact = -2.1
            breakeven_increase = "+6% order volume required"
        else:
            discount_pct = 10
            margin_impact = -3.2
            breakeven_increase = "+10% order volume required"

        return {
            "promo_code": code,
            "discount_percentage": discount_pct,
            "subtotal": subtotal,
            "estimated_discount": round(subtotal * (discount_pct / 100), 2),
            "margin_impact_pct": margin_impact,
            "breakeven_analysis": breakeven_increase,
            "recommendation": "Maintain minimum order requirement of $75 to protect baseline operating margin.",
        }

