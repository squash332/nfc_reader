#include <stdio.h>
#include "esp_log.h"
#include "wifi.hpp"
#include "http_client.hpp"
#include "nfc_sensor.hpp"
#include <pn532.h>

static const char *TAG = "MAIN";

extern "C" void app_main()
{
    nvs_init();
    esp_err_t wifi_status = wifi_init_sta();
    http_init();

    PN532 pn532;

    // wait for pn532 init, then continue 
    while (pn532.init_module_and_bus() != ESP_OK)
    {
        ESP_LOGE(TAG, "PN532 init failed, retrying...");
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
    ESP_LOGI(TAG, "PN532 init success!");

    while (true)
    {   
        // dont forget to set AP to 2.4 GHz (tested on ESP32S3 devkitc1 - only supports 2.4 GHz)
        if (wifi_status == WIFI_SUCCESS)
        {
            if (pn532.exchangeDataWithPhone())
                send_POST(pn532.uid_string);
            else if (pn532.readCard()) {
                send_POST(pn532.uid_string);
                vTaskDelay(pdMS_TO_TICKS(1500));
            }
        }

        vTaskDelay(pdMS_TO_TICKS(500));
    }
}