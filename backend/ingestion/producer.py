import pandas as pd
import json
import time
import os
from kafka import KafkaProducer

def produce_transactions():
    print("Ingestion service starting up...")
    data_path = "../../creditcard.csv"
    if not os.path.exists(data_path):
        data_path = "creditcard.csv"
        if not os.path.exists(data_path):
            print("Error: creditcard.csv not found.")
            return
    print(f"Found data file at {data_path}")

    # Kafka configuration (using docker service name 'kafka' if in docker, or 'localhost')
    bootstrap_servers = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
    
    producer = None
    max_retries = 10
    for i in range(max_retries):
        try:
            producer = KafkaProducer(
                bootstrap_servers=bootstrap_servers,
                value_serializer=lambda v: json.dumps(v).encode('utf-8')
            )
            print("Connected to Kafka!")
            break
        except Exception as e:
            print(f"Waiting for Kafka... ({i+1}/{max_retries}) - {e}")
            time.sleep(5)
    
    if not producer:
        print("Could not connect to Kafka.")
        return

    print("Streaming transactions...")
    # Load data in chunks to save memory if needed, but here we'll just read it
    df = pd.read_csv(data_path)
    
    for index, row in df.iterrows():
        transaction = row.to_dict()
        # Add a timestamp if it doesn't exist to simulate real-world arrival
        transaction['event_time'] = time.time()
        
        producer.send('transactions', transaction)
        
        if index % 100 == 0:
            print(f"Sent {index} transactions...")
            
        # Simulate streaming speed (e.g., 10 transactions per second for testing)
        time.sleep(0.1)

if __name__ == "__main__":
    produce_transactions()
