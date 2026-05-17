idf_component_register(SRCS "station_example_main.c" "mqtt_app.c"
                    PRIV_REQUIRES esp_wifi nvs_flash mqtt esp_driver_gpio
                    INCLUDE_DIRS ".")
