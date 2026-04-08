#include <stdio.h>
#include "esp_log.h"
#include "wifi.hpp"

extern "C" void app_main()
{
    nvs_init();
    wifi_init_sta();
    while(true) {
        ESP_LOGI("LOOP", "loop");
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}
