from pyflink.datastream import StreamExecutionEnvironment, RuntimeExecutionMode
from pyflink.datastream.connectors.kafka import KafkaSource, KafkaOffsetsInitializer
from pyflink.common.serialization import SimpleStringSchema
from pyflink.common import WatermarkStrategy
import redis
import json
import os

# Redis Configuration
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))

class RedisSink:
    def __init__(self):
        self.r = None

    def open(self):
        if self.r is None:
            self.r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0)

    def process(self, value):
        self.open()
        data = json.loads(value)
        # Unique ID for the user/card
        # In the Kaggle dataset, there is no UserID, but we can use 'Amount' or group of features
        # For simulation, let's assume we are tracking features by a synthetic 'card_id' 
        # (which we might need to add in the producer if it's not in the dataset)
        # Since the paper mentions 'frequency per user', I will use the row index or a dummy ID.
        
        card_id = data.get('V1', 'unknown') # V1 as a proxy for user ID for demo
        
        # Feature Engineering: 
        # 1. Update rolling window stats (simplified for demo)
        # In a real system, you'd use Flink's Windowing. 
        # For the Feature Store update, we store the full feature vector.
        
        self.r.set(f"features:{card_id}", json.dumps(data))
        return value

def run_flink_job():
    env = StreamExecutionEnvironment.get_execution_environment()
    env.set_runtime_mode(RuntimeExecutionMode.STREAMING)
    env.set_parallelism(1)

    # Kafka Source
    kafka_source = KafkaSource.builder() \
        .set_bootstrap_servers(os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')) \
        .set_topics("transactions") \
        .set_group_id("fraud-processor-group") \
        .set_starting_offsets(KafkaOffsetsInitializer.earliest()) \
        .set_value_only_deserializer(SimpleStringSchema()) \
        .build()

    stream = env.from_source(kafka_source, WatermarkStrategy.no_watermarks(), "Kafka Transactions")

    # Processing & Redis Sink
    sink = RedisSink()
    stream.map(sink.process).print()

    env.execute("Fraud Feature Processor")

if __name__ == "__main__":
    run_flink_job()
