#include "helpers.hpp"
#include "esp_log.h"
#include "esp_timer.h"

QueueHandle_t imgBufferQueue;

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
        ESP_LOGI("WS", "not connected - retrying... ");
        vTaskDelay(pdMS_TO_TICKS(100));
    }
}

void drainQueue()
{
    std::vector<uint8_t> *stale = nullptr;
    while (xQueueReceive(imgBufferQueue, &stale, 0) == pdTRUE) {
        delete stale;
        ESP_LOGI("DRAIN_QUEUE()", "deleted stale frame");
    }
}

void sendBufferTask(void *arg)
{
    if (!ws_is_connected())
            return;

    std::vector<uint8_t> *frame = nullptr;

    while (true)
    {
        if (xQueueReceive(imgBufferQueue, &frame, portMAX_DELAY) != pdTRUE)
            continue;

        // discard bad frames keep only latest
        std::vector<uint8_t> *newer = nullptr;
        while (xQueueReceive(imgBufferQueue, &newer, 0) == pdTRUE)
        {
            delete frame;
            frame = newer;
            ESP_LOGI("sendBufferTask", "deleting stale frame.");
        }

        if (!frame) {
            ESP_LOGI("no frame", "continuing...");
            continue;
        }

        

        int64_t start = esp_timer_get_time();
        bool ok = send_frame(frame->data(), frame->size());
        int64_t elapsed = (esp_timer_get_time() - start) / 1000;
        ESP_LOGI("TASK", "Send took: %lld ms", elapsed);

        delete frame;
        frame = nullptr;

        if (!ok || elapsed > 1000)
        {
            drainQueue();
            ESP_LOGW("TASK", "Send failed or slow, waiting for reconnect...");
            while (!ws_is_connected())
                vTaskDelay(pdMS_TO_TICKS(200));
        }
    }
}