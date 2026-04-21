#!/bin/bash

# Configuration
KAFKA_BROKERS=${KAFKA_BROKERS:-"localhost:9092"}

echo "--- Initializing Kafka Infrastructure ---"

# Execute the setup script
export KAFKA_BROKERS=$KAFKA_BROKERS
node "$(dirname "$0")/setup-kafka.js"

if [ $? -eq 0 ]; then
    echo "--- Kafka Infrastructure Ready ---"
else
    echo "--- Kafka Infrastructure Setup Failed ---"
    exit 1
fi
