import base64
import json
import logging
import os

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from pywebpush import WebPushException, webpush

from . import db
from .config import DATA_DIR, VAPID_CONTACT

logger = logging.getLogger(__name__)
PRIVATE_KEY_PATH = os.path.join(DATA_DIR, "vapid_private.pem")


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def ensure_keys() -> str:
    """Create the VAPID keypair on first run and return the public key for the browser."""
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(PRIVATE_KEY_PATH):
        key = ec.generate_private_key(ec.SECP256R1())
        with open(PRIVATE_KEY_PATH, "wb") as handle:
            handle.write(
                key.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.PKCS8,
                    encryption_algorithm=serialization.NoEncryption(),
                )
            )
    with open(PRIVATE_KEY_PATH, "rb") as handle:
        key = serialization.load_pem_private_key(handle.read(), password=None)
    raw = key.public_key().public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )
    return _b64(raw)


def save_subscription(subscription: dict) -> None:
    endpoint = subscription.get("endpoint")
    if not endpoint:
        raise ValueError("subscription is missing an endpoint")
    with db.connect() as conn:
        conn.execute(
            "INSERT INTO push_subscription (endpoint, subscription) VALUES (?, ?) "
            "ON CONFLICT(endpoint) DO UPDATE SET subscription = excluded.subscription",
            (endpoint, json.dumps(subscription)),
        )


def delete_subscription(endpoint: str) -> None:
    with db.connect() as conn:
        conn.execute("DELETE FROM push_subscription WHERE endpoint = ?", (endpoint,))


def send_to_all(title: str, body: str, url: str = "/") -> dict:
    ensure_keys()
    payload = json.dumps({"title": title, "body": body, "url": url})
    with db.connect() as conn:
        subs = conn.execute("SELECT endpoint, subscription FROM push_subscription").fetchall()
    sent, failed = 0, 0
    for row in subs:
        try:
            webpush(
                subscription_info=json.loads(row["subscription"]),
                data=payload,
                vapid_private_key=PRIVATE_KEY_PATH,
                vapid_claims={"sub": VAPID_CONTACT},
            )
            sent += 1
        except WebPushException as exc:
            failed += 1
            status = getattr(exc.response, "status_code", None)
            if status in (404, 410):
                delete_subscription(row["endpoint"])
            logger.warning("push failed (%s): %s", status, exc)
    return {"sent": sent, "failed": failed, "subscriptions": len(subs)}
