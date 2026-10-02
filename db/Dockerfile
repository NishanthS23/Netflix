# Base image: MongoDB 7.0
FROM mongo:7.0

# Copy initialization script to /docker-entrypoint-initdb.d/
COPY mongo-init.js /docker-entrypoint-initdb.d/

# Expose standard MongoDB port
EXPOSE 27017

# Run mongod
CMD ["mongod"]
