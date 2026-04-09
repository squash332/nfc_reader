#include <stdio.h>
#include "esp_log.h"
#include "wifi.hpp"
#include "http_client.hpp"

extern "C" void app_main()
{
    nvs_init();
    esp_err_t wifi_status = wifi_init_sta();

    
    
    while(true) {
        ESP_LOGI("test", "bla bla");
        
        if(wifi_status == WIFI_SUCCESS ) {
            ESP_LOGI("WIFI STATUS OK:", "SENDING MESSAGE...");
            const char *some_text = "Hello hehe";
            send_POST(some_text);
        }

        vTaskDelay(pdMS_TO_TICKS(3000));
    }
}
