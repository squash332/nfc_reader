#include <stdio.h>
#include "esp_log.h"
#include "wifi.hpp"
#include "http_client.hpp"
#include "nfc_sensor.hpp"
#include <pn532.h>
#include "nfc_read_task.cpp"

static const char *TAG = "ntag_read";

extern "C" void app_main()
{
    // nvs_init();
    // esp_err_t wifi_status = wifi_init_sta();
    // http_init();

    PN532 pn532;

    if (pn532.init_module_and_bus() != ESP_OK) {
        ESP_LOGE(TAG, "PN532 init failed");
        return;
    }
    
    esp_err_t ret;

    while (true)
    {
        ESP_LOGI("test", "bla bla");
        uint8_t uid[] = {0, 0, 0, 0, 0, 0, 0}; // Buffer to store the returned UID
        uint8_t uid_length = 0;                // Length of the UID (4 or 7 bytes depending on ISO14443A card type)

        // if(wifi_status == WIFI_SUCCESS ) {
        //     ESP_LOGI("WIFI STATUS OK:", "SENDING MESSAGE...");
        //     const char *some_text = "Hello hehe";
        //     send_POST(some_text);
        // }

        ret = pn532_read_passive_target_id(&pn532.io_handle, PN532_BRTY_ISO14443A_106KBPS, uid, &uid_length, 1000);

        if (ret == ESP_OK)
        {
            // Display some basic information about the card
            ESP_LOGI(TAG, "\nFound an ISO14443A card");
            ESP_LOGI(TAG, "UID Length: %d bytes", uid_length);
            ESP_LOGI(TAG, "UID Value:");
            ESP_LOG_BUFFER_HEX_LEVEL(TAG, uid, uid_length, ESP_LOG_INFO);
        }
        else
        {
            ESP_LOGE(TAG, "Reading not successful");
        }
        ret = pn532_in_list_passive_target(&pn532.io_handle);

        NTAG2XX_MODEL ntag_model = NTAG2XX_UNKNOWN;
        ret = ntag2xx_get_model(&pn532.io_handle, &ntag_model);
        if (ret != ESP_OK)
            continue;

        int page_max;
        switch (ntag_model)
        {
        case NTAG2XX_NTAG213:
            page_max = 45;
            ESP_LOGI(TAG, "found NTAG213 target (or maybe NTAG203)");
            break;

        case NTAG2XX_NTAG215:
            page_max = 135;
            ESP_LOGI(TAG, "found NTAG215 target");
            break;

        case NTAG2XX_NTAG216:
            page_max = 231;
            ESP_LOGI(TAG, "found NTAG216 target");
            break;

        default:
            ESP_LOGI(TAG, "Found unknown NTAG target!");
            continue;
        }

        for (int page = 0; page < page_max; page += 4)
        {
            uint8_t buf[16];
            ret = ntag2xx_read_page(&pn532.io_handle, page, buf, 16);
            if (ret == ESP_OK)
            {
                ESP_LOG_BUFFER_HEXDUMP(TAG, buf, 16, ESP_LOG_INFO);
            }
            else
            {
                ESP_LOGI(TAG, "Failed to read page %d", page);
                break;
            }
        }
        vTaskDelay(pdMS_TO_TICKS(2000));
    }
}
