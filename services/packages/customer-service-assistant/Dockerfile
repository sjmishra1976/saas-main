FROM n8nio/n8n:latest

USER root
COPY workflows /opt/bootstrap/workflows
COPY docker-entrypoint.sh /opt/bootstrap/docker-entrypoint.sh
RUN chmod +x /opt/bootstrap/docker-entrypoint.sh
USER node

ENTRYPOINT ["/opt/bootstrap/docker-entrypoint.sh"]
