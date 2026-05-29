#include "helpers.hpp"
#include "esp_log.h"
#include "esp_timer.h"

QueueHandle_t imgBufferQueue;
Camera *cam = nullptr;

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

    cam = new Camera{};
    ESP_LOGW("MAIN", "initializing...");
    vTaskDelay(pdMS_TO_TICKS(2000));

    while (!ws_is_connected())
    {
        vTaskDelay(pdMS_TO_TICKS(100));
    }
}

void sendBufferTask(void *arg)
{
    std::vector<uint8_t> *frame = nullptr;
    while (true)
    {
        if (xQueueReceive(imgBufferQueue, &frame, portMAX_DELAY) == pdTRUE)
        {
            if (frame)
            {
                int64_t start = esp_timer_get_time();
                send_frame(frame->data(), frame->size());
                int64_t end = esp_timer_get_time();
                ESP_LOGI("TEST", "Send took: %lld ms", (end - start) / 1000);
                delete frame; // done with it
                frame = nullptr;
            }
        }
    }
}