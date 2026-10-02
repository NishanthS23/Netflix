// MongoDB initialization script executed on container initialization
db = db.getSiblingDB('netflix');

// Initialize collections if needed
db.createCollection('users');
print('MongoDB initialized with netflix database');
