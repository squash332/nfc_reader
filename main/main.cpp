#include <stdio.h>
#include "esp_log.h"
#include "wifi.hpp"
#include "http_client.hpp"
#include "nfc_sensor.hpp"
#include <pn532.h>
#include "camera.hpp"

static const char *TAG = "MAIN";

extern "C" void app_main()
{
    nvs_init();
    wifi_init_sta();

    // PN532 pn532;
    // while (pn532.init_module_and_bus() != ESP_OK)
    // {
    //     ESP_LOGE(TAG, "PN532 init failed, retrying...");
    //     vTaskDelay(pdMS_TO_TICKS(1000));
    // }
    // ESP_LOGI(TAG, "PN532 init success!");

    Camera cam{};

    while (true)
    {
        ESP_LOGI(TAG, "Free heap: %lu", esp_get_free_heap_size());
        auto frame = cam.capture();
        if (frame)
        {
            ESP_LOGI(TAG, "Frame size: %d bytes", frame->size());
            ESP_LOGI("CAM", "picture taken!");
            send_frame(frame->data(), frame->size());
            vTaskDelay(pdMS_TO_TICKS(1000));
        }

        ESP_LOGI(TAG, "looping");
        vTaskDelay(pdMS_TO_TICKS(500));
    }
}

