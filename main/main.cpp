#include "helpers.hpp"

static const char *TAG = "MAIN";

extern "C" void app_main()
{
    app_init();
    imgBufferQueue = xQueueCreate(4, sizeof(std::vector<uint8_t> *));
    xTaskCreatePinnedToCore(sendBufferTask, "sendBufferTask", 8192, NULL, 5, &sendBufferHandle, 1);

    while (true)
    {
        if (ws_is_connected())
        {
            auto *frame = cam->capture();
            if (frame)
            {
                ESP_LOGI(TAG, "frame captured — queue: %u/4", uxQueueMessagesWaiting(imgBufferQueue));
                if (xQueueSend(imgBufferQueue, &frame, 0) != pdTRUE)
                {
                    delete frame;
                    ESP_LOGW(TAG, "Queue full, dropping frame");
                }
            }

        }
        vTaskDelay(pdMS_TO_TICKS(500));
    }
}
