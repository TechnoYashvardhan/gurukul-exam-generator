"""
Generates local SSL certificates (cert.pem and key.pem) with Subject Alternative Names (SAN)
including localhost, 127.0.0.1, and all local network IPv4 addresses.
"""

import datetime
import ipaddress
import os
import socket
from pathlib import Path
from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from cryptography.x509.oid import NameOID


def get_all_local_ips():
    ips = {"127.0.0.1", "0.0.0.0"}
    try:
        # Get hostname
        hostname = socket.gethostname()
        for info in socket.getaddrinfo(hostname, None, socket.AF_INET):
            ips.add(info[4][0])
    except Exception:
        pass
    
    # Try connecting to external DNS to discover default gateway route IP
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ips.add(s.getsockname()[0])
        s.close()
    except Exception:
        pass

    return sorted(list(ips))


def generate_certs(output_dir: str = "certs"):
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    key_path = out_path / "key.pem"
    cert_path = out_path / "cert.pem"

    print("Generating 2048-bit RSA Private Key...")
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )

    local_ips = get_all_local_ips()
    print(f"Detected IP addresses for SAN certificate: {local_ips}")

    alt_names = [x509.DNSName("localhost"), x509.DNSName(socket.gethostname())]
    for ip in local_ips:
        try:
            alt_names.append(x509.IPAddress(ipaddress.ip_address(ip)))
        except ValueError:
            pass

    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, "IN"),
        x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "Uttarakhand"),
        x509.NameAttribute(NameOID.LOCALITY_NAME, "Haridwar"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Gurukul AI"),
        x509.NameAttribute(NameOID.COMMON_NAME, "Gurukul Local HTTPS"),
    ])

    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(private_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.datetime.now(datetime.timezone.utc))
        .not_valid_after(datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=365))
        .add_extension(
            x509.SubjectAlternativeName(alt_names),
            critical=False,
        )
        .add_extension(
            x509.BasicConstraints(ca=True, path_length=None),
            critical=True,
        )
        .sign(private_key, hashes.SHA256())
    )

    # Write private key
    with open(key_path, "wb") as f:
        f.write(
            private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.TraditionalOpenSSL,
                encryption_algorithm=serialization.NoEncryption(),
            )
        )

    # Write certificate
    with open(cert_path, "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))

    print(f"[OK] SSL Private Key saved to: {key_path.resolve()}")
    print(f"[OK] SSL Certificate saved to: {cert_path.resolve()}")
    return str(key_path.resolve()), str(cert_path.resolve())


if __name__ == "__main__":
    generate_certs()
