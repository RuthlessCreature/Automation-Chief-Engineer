FROM docker.io/cloudflare/sandbox:0.12.9

USER root

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates python3 python3-pip libgl1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.lock /tmp/cadcore-requirements.lock
RUN python3 -m pip install --no-cache-dir --upgrade pip \
    && python3 -m pip install --no-cache-dir -r /tmp/cadcore-requirements.lock

COPY runner /opt/cadcore
COPY scripts/validate_r2_f10_golden_delivery.py /opt/cadcore/validate_r2_f10_golden_delivery.py
RUN chmod 0555 /opt/cadcore/*.py && mkdir -p /workspace/cad

EXPOSE 8080
