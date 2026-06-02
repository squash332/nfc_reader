#include "helpers.hpp"
#include "esp_log.h"

void app_init()
{
    nvs_init();
    wifi_init_sta();
    ws_init();

    // PN532 pn532;
    // while (pn532.init_module_and_bus() != ESP_OK)
    // {
    //     ESP_LOGE(TAG, "PN532 init failed, retrying...");
    //     vTaskDelay(pdMS_TO_TICKS(1000));
    // }
    // ESP_LOGI(TAG, "PN532 init success!");

    ESP_LOGW("MAIN", "initializing...");
    while (!ws_is_connected())
    {
        ESP_LOGI("WS", "not connected - retrying...");
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}
