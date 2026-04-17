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
    char block_data[16];

    if (pn532.init_module_and_bus() != ESP_OK)
    {
        ESP_LOGE(TAG, "PN532 init failed");
        return;
    }
    else
    {
        ESP_LOGI(TAG, "PN532 init success!");
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
    while (true)
    {
        if (wifi_status == WIFI_SUCCESS && pn532.readCard()) 
        {
            pn532.printBlock(0, 1);
            vTaskDelay(pdMS_TO_TICKS(500));

            esp_err_t ret = pn532.writeBlock(0, 1, "lmao");
            if (pn532.readBlock(1, (uint8_t *)block_data, 16) == ESP_OK) {
                send_POST(pn532.uid_string, block_data);
            }

            if (ret != ESP_OK)
            {
                ESP_LOGE(TAG, "WRITE FAILED");
            }
            pn532.printBlock(0, 1);
            pn532.writeBlock(0, 1, "jeff");
        }

        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}