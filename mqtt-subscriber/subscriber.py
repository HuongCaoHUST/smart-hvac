import paho.mqtt.client as mqtt
import json
import psycopg2
import os
from datetime import datetime

# Config
MQTT_BROKER = os.getenv('MQTT_BROKER', 'mosquitto')
DB_HOST = os.getenv('DB_HOST', 'timescaledb')
DB_NAME = os.getenv('DB_NAME', 'iotdb')
DB_USER = os.getenv('DB_USER', 'admin')
DB_PASS = os.getenv('DB_PASSWORD', 'admin123')

# ====================== DATABASE ======================
conn = psycopg2.connect(
    host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASS
)
cur = conn.cursor()

# Tạo bảng + hypertable
cur.execute("""
CREATE TABLE IF NOT EXISTS sensor_data (
    time TIMESTAMPTZ NOT NULL,
    device_id TEXT,
    temperature FLOAT,
    humidity FLOAT,
    co2 INT,
    dust FLOAT,
    PRIMARY KEY (time, device_id)
);

SELECT create_hypertable('sensor_data', 'time', if_not_exists => TRUE);
""")
conn.commit()

# ====================== MQTT CALLBACK (Phiên bản mới) ======================
def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print("✅ Connected to MQTT Broker!")
        client.subscribe("sensor/#")        # Thay đổi topic nếu cần
    else:
        print(f"❌ Connect failed, code: {rc}")

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode('utf-8'))
        device_id = payload.get('device_id', 'unknown')

        cur.execute("""
            INSERT INTO sensor_data (time, device_id, temperature, humidity, co2, dust)
            VALUES (NOW(), %s, %s, %s, %s, %s)
        """, (
            device_id,
            payload.get('temperature'),
            payload.get('humidity'),
            payload.get('co2'),
            payload.get('dust')
        ))
        conn.commit()
        
        print(f"✅ Saved → Device: {device_id} | Temp: {payload.get('temperature')} | CO2: {payload.get('co2')}")
        
    except Exception as e:
        print(f"❌ Error processing message: {e} | Topic: {msg.topic}")

# ====================== MAIN ======================
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)   # ← Sửa ở đây
client.on_connect = on_connect
client.on_message = on_message

print("🚀 MQTT Subscriber đang chạy...")
client.connect(MQTT_BROKER, 1883, 60)
client.loop_forever()