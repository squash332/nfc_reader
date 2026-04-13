#include <stdio.h>
#include "esp_log.h"
#include "wifi.hpp"
#include "http_client.hpp"
#include "nfc_sensor.hpp"
#include <pn532.h>

static const char *TAG = "ntag_read";
// void test_base64();

extern "C" void app_main()
{
    // nvs_init();
    // esp_err_t wifi_status = wifi_init_sta();
    // http_init();

    PN532 pn532;

    if (pn532.init_module_and_bus() != ESP_OK)
    {
        ESP_LOGE(TAG, "PN532 init failed");
        // return; 
    }
    else {
        ESP_LOGI(TAG, "PN532 init success!");
    }

    vTaskDelay(pdMS_TO_TICKS(1000));
    while (true)
    {
        ESP_LOGI("test", "bla bla");
        
        // if (wifi_status == WIFI_SUCCESS)
        // {
        //     ESP_LOGI("WIFI STATUS OK:", "SENDING MESSAGE...");
        //     vTaskDelay(pdMS_TO_TICKS(500)); // this needs to
        // }

        pn532.readCard();


        vTaskDelay(pdMS_TO_TICKS(3000));
    }
}