#include "helpers.hpp"

static const char *TAG = "MAIN";

extern "C" void app_main()
{
    app_init();
    Camera cam{};
    imgBufferQueue = xQueueCreate(4, sizeof(std::vector<uint8_t> *));
    xTaskCreatePinnedToCore(sendBufferTask, "sendBufferTask", 8192, NULL, 5, &sendBufferHandle, 1);

    while (true)
    {
        if (ws_is_connected())
        {
            auto *frame = cam.capture();
            if (frame)
            {
                ESP_LOGI(TAG, "frame captured — queue: %u/4", uxQueueMessagesWaiting(imgBufferQueue));
                if (xQueueSend(imgBufferQueue, &frame, 0) != pdTRUE)
                {
                    drainQueue();
                    xQueueSend(imgBufferQueue, &frame, 0);
                    ESP_LOGW(TAG, "Queue was full, drained and pushed latest frame");
                }
            }
        }
        else
        {
            ESP_LOGI(TAG, "waiting for websocket connection to open...");
        }
        vTaskDelay(pdMS_TO_TICKS(500));
    }
}
