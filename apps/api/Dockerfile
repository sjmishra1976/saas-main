FROM node:20-bookworm

RUN apt-get update \
  && apt-get install -y curl gnupg ca-certificates \
  && curl -sSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg \
  && echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" > /etc/apt/sources.list.d/google-cloud-sdk.list \
  && apt-get update \
  && apt-get install -y google-cloud-cli kubectl \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /repo/apps/api

CMD ["sh", "-c", "npm install && npm run dev"]
